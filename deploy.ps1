param([Parameter(Mandatory = $true)][string]$Workspace)
$ErrorActionPreference = 'Stop'
npm test
if ($LASTEXITCODE -ne 0) { throw 'Chess tests failed' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Static build failed' }
npx rayfin login
if ($LASTEXITCODE -ne 0) { throw 'Rayfin login failed' }
npx rayfin up --workspace $Workspace
if ($LASTEXITCODE -ne 0) { throw 'Fabric deployment failed' }
npx rayfin up status
