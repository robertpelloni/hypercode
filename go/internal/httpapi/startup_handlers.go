package httpapi

import (
	"context"
	"net/http"
	"time"

	"github.com/borghq/borg-go/internal/config"
	"github.com/borghq/borg-go/internal/interop"
	"github.com/borghq/borg-go/internal/memorystore"
)

type StartupBlockingReason struct {
	Code   string `json:"code"`
	Detail string `json:"detail"`
}

type StartupStatus struct {
	Status          string                  `json:"status"`
	Ready           bool                    `json:"ready"`
	Summary         string                  `json:"summary"`
	BlockingReasons []StartupBlockingReason `json:"blockingReasons"`
	Checks          map[string]any          `json:"checks"`
}

func (s *Server) handleStartupStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"success": false, "error": "method not allowed"})
		return
	}

	configStatus := config.Snapshot(s.cfg)
	memoryStatus, err := memorystore.ReadStatus(s.cfg.WorkspaceRoot)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}

	meshStatus, err := s.mesh.Status(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"success": false, "error": err.Error()})
		return
	}

	upstreamReady, upstreamBase := s.checkUpstreamProcedure(r.Context(), "health", nil)
	supervisorReady, supervisorBase := s.checkUpstreamProcedure(r.Context(), "session.catalog", nil)

	blockingReasons := make([]StartupBlockingReason, 0, 4)
	if !configStatus.WorkspaceRoot.Exists {
		blockingReasons = append(blockingReasons, StartupBlockingReason{
			Code:   "workspace_root_missing",
			Detail: "Workspace root is not available to the Go sidecar.",
		})
	}
	if !configStatus.ConfigDir.Exists {
		blockingReasons = append(blockingReasons, StartupBlockingReason{
			Code:   "go_config_dir_missing",
			Detail: "Go sidecar config directory has not been created yet.",
		})
	}
	if !memoryStatus.Exists {
		blockingReasons = append(blockingReasons, StartupBlockingReason{
			Code:   "memory_store_not_ready",
			Detail: "Sectioned memory store is not available yet.",
		})
	}
	if !upstreamReady {
		blockingReasons = append(blockingReasons, StartupBlockingReason{
			Code:   "main_control_plane_unreachable",
			Detail: "The Go sidecar cannot currently reach the main TypeScript control plane.",
		})
	}
	if !supervisorReady {
		blockingReasons = append(blockingReasons, StartupBlockingReason{
			Code:   "session_supervisor_bridge_unavailable",
			Detail: "The supervised-session bridge is not reachable through the main control plane.",
		})
	}

	summary := "All Go startup checks passed."
	if len(blockingReasons) > 0 {
		summary = "Startup pending: "
		for i, reason := range blockingReasons {
			if i > 0 {
				summary += " "
			}
			summary += reason.Detail
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": StartupStatus{
			Status:          "running",
			Ready:           len(blockingReasons) == 0,
			Summary:         summary,
			BlockingReasons: blockingReasons,
			Checks: map[string]any{
				"config": map[string]any{
					"workspaceRootAvailable": configStatus.WorkspaceRoot.Exists,
					"goConfigDirAvailable":   configStatus.ConfigDir.Exists,
					"mainConfigDirAvailable": configStatus.MainConfigDir.Exists,
					"repoConfigAvailable":    configStatus.BorgConfigFile.Exists,
					"mcpConfigAvailable":     configStatus.MCPConfigFile.Exists,
				},
				"memory": map[string]any{
					"ready":                   memoryStatus.Exists,
					"storePath":               memoryStatus.StorePath,
					"totalEntries":            memoryStatus.TotalEntries,
					"presentDefaultSections":  memoryStatus.PresentDefaultSectionCount,
					"expectedDefaultSections": memoryStatus.DefaultSectionCount,
					"missingSections":         memoryStatus.MissingSections,
				},
				"mainControlPlane": map[string]any{
					"ready":   upstreamReady,
					"baseUrl": upstreamBase,
				},
				"sessionSupervisorBridge": map[string]any{
					"ready":   supervisorReady,
					"baseUrl": supervisorBase,
				},
				"mesh": map[string]any{
					"nodeId":     meshStatus.NodeID,
					"peersCount": meshStatus.PeersCount,
				},
			},
		},
	})
}

func (s *Server) checkUpstreamProcedure(ctx context.Context, procedure string, payload any) (bool, string) {
	checkCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	result, err := interop.CallTRPCProcedure(checkCtx, s.cfg.MainLockPath(), procedure, payload)
	if err != nil {
		return false, ""
	}

	return true, result.BaseURL
}
