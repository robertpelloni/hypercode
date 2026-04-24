#!/bin/bash
set -e

echo "Starting Borg 1.0.0-alpha.32 (Go Native Core)..."

if ! command -v go &> /dev/null
then
    echo "go could not be found. Please install Go 1.22+."
    exit 1
fi

VER="1.0.0-alpha.32"
echo "Building Borg Go Control Plane..."
cd go
go build -ldflags "-X internal/buildinfo.Version=$VER" -buildvcs=false -o ../bin/borg ./cmd/borg
cd ..

echo "Launching Borg..."
./bin/borg "$@"
