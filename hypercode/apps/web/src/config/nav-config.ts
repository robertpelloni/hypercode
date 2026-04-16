import { NavArea } from "@/types/nav";
import {
    BuildingLibraryIcon,
    CommandLineIcon,
    CircleStackIcon,
    CpuChipIcon,
    UserGroupIcon,
    CloudIcon,
    GlobeAltIcon
} from "@heroicons/react/24/outline";

export const MCPAreas: NavArea[] = [
    {
        id: "system",
        label: "Core System",
        description: "Foundational subsystems and metrics",
        items: [
            { id: "webui", label: "Open-WebUI", path: "/dashboard/webui", icon: GlobeAltIcon },
            { id: "pulse", label: "Pulse", path: "/dashboard", icon: CpuChipIcon },
            { id: "tools", label: "Host Terminal", path: "/dashboard/mcp/tools", icon: CommandLineIcon },
            { id: "browser", label: "Semantic Browser", path: "/dashboard/browser", icon: GlobeAltIcon },
        ]
    },
    {
        id: "intelligence",
        label: "Intelligence",
        description: "Agent execution and memory domains",
        items: [
            { id: "agents", label: "Agent Dispatch", path: "/dashboard/agents", icon: UserGroupIcon },
            { id: "swarm", label: "Swarm Control", path: "/dashboard/swarm", icon: UserGroupIcon },
            { id: "memory", label: "Memory Pipeline", path: "/dashboard/memory", icon: CircleStackIcon },
        ]
    },
    {
        id: "cloud",
        label: "Cloud Ops",
        description: "Remote provider and agent control",
        items: [
            { id: "cloud-dev", label: "Cloud Workspace", path: "/dashboard/cloud-dev", icon: CloudIcon },
            { id: "billing", label: "Billing Matrix", path: "/dashboard/billing", icon: BuildingLibraryIcon },
        ]
    }
];
