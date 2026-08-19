# Weave Core Compiler (`weave-core`)

The official Rust implementation of the Weave language core compiler, AST/CST syntax tree, and CLI.

## Features

- ⚡ **Ultra-Fast Lexing**: Powered by [`logos`](https://crates.io/crates/logos).
- 🌲 **Fault-Tolerant CST/AST**: Built on [`rowan`](https://crates.io/crates/rowan), the lossless syntax tree engine used by `rust-analyzer`.
- 🔍 **Recursive Descent Parser**: Robust parsing with intelligent error recovery and rich diagnostic reporting.
- 🛠️ **Command-Line Interface**: Modern CLI powered by [`clap`](https://crates.io/crates/clap) supporting `build`, `check`, `dev`, and `parse` subcommands.

## Usage

```bash
# Check syntax of a Weave file
cargo run -- check examples/counter.wv

# Build a Weave project
cargo run -- build examples/counter.wv -o dist/

# Run dev mode
cargo run -- dev examples/counter.wv

# Dump AST / CST structure
cargo run -- parse examples/counter.wv
```
