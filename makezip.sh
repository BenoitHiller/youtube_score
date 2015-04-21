#!/bin/bash
find . -not -path "*.git*" -type f | grep -vE "LICENSE|banner|README|.svg|.sh|.xcf|playlist" | zip youtube.zip -@
