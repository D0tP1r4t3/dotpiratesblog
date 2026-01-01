#!/bin/bash
# Hostinger deployment build script

echo "Building Hugo site..."
hugo --minify

echo "Build complete! Files are in /public/"
