
$repos = @(
    @{ Url = "https://github.com/appcypher/awesome-mcp-servers"; Path = "external/awesome-mcp-servers-appcypher" },
    @{ Url = "https://github.com/wong2/awesome-mcp-servers"; Path = "external/awesome-mcp-servers-wong2" },
    @{ Url = "https://github.com/toolsdk-ai/toolsdk-mcp-registry"; Path = "external/toolsdk-mcp-registry" },
    @{ Url = "https://github.com/Arindam200/awesome-ai-apps"; Path = "external/awesome-ai-apps" },
    @{ Url = "https://github.com/stared/gemini-claude-skills"; Path = "external/skills_repos/gemini-claude-skills" },
    @{ Url = "https://github.com/bkircher/skills"; Path = "external/skills_repos/bkircher-skills" }
)

foreach ($repo in $repos) {
    if (Test-Path $repo.Path) {
        Write-Host "Skipping $($repo.Path) (Already exists)"
    } else {
        Write-Host "Adding $($repo.Url) -> $($repo.Path)"
        git submodule add $repo.Url $repo.Path
    }
}
