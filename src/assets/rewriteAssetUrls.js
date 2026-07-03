export default function rewriteAssetUrls(value, assetMap) {
  let output = value;

  for (const [remoteUrl, publicPath] of assetMap.entries()) {
    output = output.split(remoteUrl).join(publicPath);
  }

  return output;
}
