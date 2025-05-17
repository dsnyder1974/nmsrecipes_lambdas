param (
    [string]$LayerName = "pg-secrets-lib",
    [string]$ZipPath = ".\pg-secrets-lib.zip",
    [string]$Runtime = "nodejs22.x",
    [string]$Region = "us-east-2",
    [string]$Description = "PostgreSQL client + Secrets Manager layer",
    [string]$LambdaCategoryDir = ".\..\pgCategory",
    [string]$Stage = "dev",
    [string]$FunctionName = "my-lambda-function"
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

    Write-Host "Updating Lambda function '$functionName' with new layer..."
    $updateOutput = aws lambda update-function-configuration `
        --function-name $functionName `
        --layers $latestArn `
        --region $Region `
        | ConvertFrom-Json
    Write-Host "Lambda '$($updateOutput.FunctionName)' updated."
}

Write-Host "All Lambdas in '$LambdaCategoryDir' updated with new '$LayerName' layer."
