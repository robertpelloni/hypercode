package httpapi

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/hypercodehq/hypercode-go/internal/hsync"
)

func (s *Server) handleBrowserStatus(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "browser.status", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "browser.status",
			},
		})
		return
	}

	writeJSON(w, http.StatusServiceUnavailable, map[string]any{
		"success": false,
		"error":   "Browser runtime is unavailable: upstream browser service is not available locally.",
		"data": map[string]any{
			"available": false,
			"active":    false,
			"pageCount": 0,
			"pageIds":   []string{},
		},
		"bridge": map[string]any{
			"fallback":  "go-local-browser",
			"procedure": "browser.status",
			"reason":    "upstream unavailable; browser service is not available locally",
		},
	})
}

func (s *Server) handleBrowserClosePage(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browser.closePage")
}

func (s *Server) handleBrowserCloseAll(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeCall(w, r, http.MethodPost, "browser.closeAll", nil)
}

func (s *Server) handleBrowserSearchHistory(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "missing query parameter"})
		return
	}

	payload := map[string]any{"query": query}
	if maxResults := strings.TrimSpace(r.URL.Query().Get("maxResults")); maxResults != "" {
		parsed, err := strconv.Atoi(maxResults)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid maxResults query parameter"})
			return
		}
		payload["maxResults"] = parsed
	}
	s.handleTRPCBridgeCall(w, r, http.MethodGet, "browser.searchHistory", payload)
}

func (s *Server) handleBrowserScrapePage(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "browser.scrapePage", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "browser.scrapePage",
			},
		})
		return
	}

	var payload struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid request body"})
		return
	}

	pageData, scrapeErr := hsync.ScrapePage(r.Context(), payload.URL)
	if scrapeErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   scrapeErr.Error(),
			"detail":  scrapeErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data":    pageData,
		"bridge": map[string]any{
			"fallback":  "go-local-browser",
			"procedure": "browser.scrapePage",
			"reason":    "upstream unavailable; executing native Go chromedp scrape",
		},
	})
}

func (s *Server) handleBrowserScreenshot(w http.ResponseWriter, r *http.Request) {
	var result any
	upstreamBase, err := s.callUpstreamJSON(r.Context(), "browser.screenshot", nil, &result)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"data":    result,
			"bridge": map[string]any{
				"upstreamBase": upstreamBase,
				"procedure":    "browser.screenshot",
			},
		})
		return
	}

	var payload struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"success": false, "error": "invalid request body"})
		return
	}

	buf, screenshotErr := hsync.ScreenshotPage(r.Context(), payload.URL)
	if screenshotErr != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"success": false,
			"error":   screenshotErr.Error(),
			"detail":  screenshotErr.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"screenshot": base64.StdEncoding.EncodeToString(buf),
		},
		"bridge": map[string]any{
			"fallback":  "go-local-browser",
			"procedure": "browser.screenshot",
			"reason":    "upstream unavailable; executing native Go chromedp screenshot",
		},
	})
}

func (s *Server) handleBrowserDebug(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browser.debug")
}

func (s *Server) handleBrowserProxyFetch(w http.ResponseWriter, r *http.Request) {
	s.handleTRPCBridgeBodyCall(w, r, "browser.proxyFetch")
}
