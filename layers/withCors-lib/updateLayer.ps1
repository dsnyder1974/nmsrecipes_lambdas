param (
    [string]$LayerName = "withCors-lib",
    [string]$ZipPath = ".\withCorse-lib.zip",
    [string]$Runtime = "nodejs22.x",
    [string]$Region = "us-east-2",
    [string]$Description = "Add cors headers layer",
    [string]$LambdaCategoryDir = ".\..\..\pgCategory",
    [string]$Stage = "dev"
)

# Step 1: Compress the layer
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

Write-Host "Compressing $LayerName layer..."
Compress-Archive -Path .\nodejs -DestinationPath $ZipPath -Force
Write-Host "$LayerName layer compressed into $ZipPath"

# Step 2: Publish new layer
Write-Host "Publishing $LayerName..."
$publishOutput = aws lambda publish-layer-version `
    --layer-name $LayerName `
    --zip-file "fileb://$ZipPath" `
    --compatible-runtimes $Runtime `
    --description "$Description" `
    --region $Region `
    | ConvertFrom-Json
$latestArn = $publishOutput.LayerVersionArn
Write-Host "Published $LayerName, ARN: $latestArn"

# Step 3: Update each Lambda function under lambda root
Write-Host "Updating all lambdas in '$LambdaCategoryDir'"
$lambdaFolders = Get-ChildItem -Path $LambdaCategoryDir -Directory

foreach ($folder in $lambdaFolders) {
    $functionName = "$Stage-$($folder.Name)"

    # Step 3.1: Get current attached layer ARNs
    $existingLayers = aws lambda get-function-configuration `
        --function-name $functionName `
        --region $Region `
        --query "Layers[*].Arn" `
        --output json | ConvertFrom-Json
    Write-Host "Current layers for '$functionName':"
    $existingLayers | ForEach-Object { Write-Host "  $_" }

    # Step 3.2: Convert to array and filter out any older versions of the same layer name
    $filteredLayers = @()
    foreach ($layer in $existingLayers) {
        # Write-Host "Checking layer: $layer"
        if ($layer -notlike "*:layer:${LayerName}:*") {
            $filteredLayers += $layer
        }
    }

    # Step 3.3: Append the new version
    $updatedLayers = $filteredLayers + $latestArn
    Write-Host "New layers for '$functionName':"
    $updatedLayers | ForEach-Object { Write-Host "  $_" }

    # Step 3.4: Update Lambda configuration
    # Note: The --layers parameter expects a list of ARNs separated by a space
    Write-Host "Updating Lambda function '$functionName' with new layers..."
    $updateOutput = aws lambda update-function-configuration `
        --function-name $functionName `
        --layers @($updatedLayers) `
        --region $Region `
        | ConvertFrom-Json
    Write-Host "Lambda '$($updateOutput.FunctionName)' updated."
}

Write-Host "All Lambdas in '$LambdaCategoryDir' updated with new '$LayerName' layer."
