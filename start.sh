#!/bin/bash
set -e

echo "Starting HyperCode 1.0.0-alpha.32 (Go Native Core)..."

if ! command -v go &> /dev/null
then
    echo "go could not be found. Please install Go 1.22+."
    exit 1
fi

VER="1.0.0-alpha.32"
echo "Building HyperCode Go Control Plane..."
cd go
go build -ldflags "-X internal/buildinfo.Version=$VER" -buildvcs=false -o ../bin/hypercode ./cmd/hypercode
cd ..

echo "Launching HyperCode..."
./bin/hypercode "$@"
