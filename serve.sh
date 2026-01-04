#!/bin/bash

# I-AM Application Server
# Simple HTTP server for local development

echo "🚀 Starting I-AM Sovereign Intelligence Network..."
echo ""
echo "📂 Serving from: /app/i-am"
echo "🌐 Access at: http://localhost:8000"
echo ""
echo "✅ Features available:"
echo "   • Sovereign Identity (Ed25519)"
echo "   • Local AI (Ollama/Transformers.js)"
echo "   • IPFS Integration (Kubo/Helia)"
echo "   • Code Editor"
echo "   • Memory System with Embeddings"
echo "   • Developer Mode (Ctrl+Shift+D)"
echo ""
echo "💡 Optional services:"
echo "   • Ollama: http://localhost:11434"
echo "   • IPFS Kubo: http://127.0.0.1:5001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd /app/i-am
python3 -m http.server 8000
