Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:/Users/hyper/.gemini/antigravity/brain/3f267825-b33e-44e9-957c-3d4ff1b84eb6/hypercode_bridge_icon_raw_1770126032082.png')
$sizes = @(16, 48, 128)
foreach ($size in $sizes) {
    $bmp = new-object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    $dest = "c:/Users/hyper/workspace/hypercode/apps/extension/icons/icon$size.png"
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Saved $dest"
}
$img.Dispose()
