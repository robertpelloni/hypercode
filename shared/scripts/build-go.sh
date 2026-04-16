#!/usr/bin/env bash
# build-go.sh — Build the HyperCode Go sidecar with version from VERSION file
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION_FILE="$ROOT_DIR/VERSION"
GO_DIR="$ROOT_DIR/go"
OUTPUT="$ROOT_DIR/bin/hypercode.exe"

if [ ! -f "$VERSION_FILE" ]; then
  echo "ERROR: VERSION file not found at $VERSION_FILE" >&2
  exit 1
fi

VERSION="$(cat "$VERSION_FILE" | tr -d '[:space:]')"
echo "Building HyperCode Go sidecar v$VERSION..."

cd "$GO_DIR"
go build \
  -ldflags "-X internal/buildinfo.Version=$VERSION" \
  -o "$OUTPUT" \
  ./cmd/hypercode

echo "Built: $OUTPUT"
"$OUTPUT" version
