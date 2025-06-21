# Variables
$LambdaFunctionName = "dev-pgGetItemRecipes"
$SourcePaths = @("index.mjs", "package.json")
$ZipFilePath = "dev-pgGetItemRecipes.zip"

# Step 1: Remove existing zip if exists
if (Test-Path $ZipFilePath) {
    Write-Host "Removing existing zip file..."
    Remove-Item $ZipFilePath
}

# Step 2: Compress files into zip
Write-Host "Compressing files into $ZipFilePath..."
Compress-Archive -Path $SourcePaths -DestinationPath $ZipFilePath

# Step 3: Update Lambda function code using AWS CLI
Write-Host "Updating Lambda function $LambdaFunctionName with $ZipFilePath..."
$updateResult = aws lambda update-function-code `
    --function-name $LambdaFunctionName `
    --zip-file fileb://$ZipFilePath `
    --output json | ConvertFrom-Json
Write-Host "Function updated: $($updateResult.FunctionArn)"

# Done
Write-Host "Lambda function updated successfully."
