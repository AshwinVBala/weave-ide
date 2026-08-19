pub mod commands;
pub mod runner;

use clap::{Parser as ClapParser, Subcommand};
use std::path::PathBuf;
use anyhow::Result;

#[derive(ClapParser, Debug)]
#[command(
    name = "weave",
    author = "Weave Authors",
    version,
    about = "The Weave Programming Language Compiler & Toolchain",
    long_about = "Weave is a modern declarative programming language for full-stack reactive applications."
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug, Clone, PartialEq, Eq)]
pub enum Commands {
    /// Run a Weave program (checks, builds, and executes runner)
    Run {
        /// Path to .wv file or directory containing .wv files
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Port to listen on (optional dev server mode)
        #[arg(short, long)]
        port: Option<u16>,
    },

    /// Check Weave source file(s) for syntax errors and diagnostics
    Check {
        /// Path to .wv file or directory containing .wv files
        #[arg(default_value = ".")]
        path: PathBuf,
    },

    /// Build and compile Weave source files
    Build {
        /// Path to .wv file or directory containing .wv files
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Output directory for compiled artifacts
        #[arg(short, long)]
        out_dir: Option<PathBuf>,

        /// Build in release mode with optimizations
        #[arg(long, default_value_t = false)]
        release: bool,
    },

    /// Start the Weave development server with live reload
    Dev {
        /// Path to .wv file or project directory
        #[arg(default_value = ".")]
        path: PathBuf,

        /// Port to listen on
        #[arg(short, long, default_value_t = 3000)]
        port: u16,
    },

    /// Parse a Weave file and display its AST / CST representation
    Parse {
        /// Path to .wv file
        path: PathBuf,

        /// Show full Rowan Concrete Syntax Tree (CST)
        #[arg(long, default_value_t = false)]
        cst: bool,
    },
}

impl Cli {
    pub async fn run(self) -> Result<()> {
        match self.command {
            Commands::Run { path, port } => runner::run(&path, port).await,
            Commands::Check { path } => commands::check(&path),
            Commands::Build {
                path,
                out_dir,
                release,
            } => {
                commands::build(&path, &out_dir, release)?;
                Ok(())
            }
            Commands::Dev { path, port } => commands::dev(&path, port).await,
            Commands::Parse { path, cst } => {
                commands::parse(&path, cst)?;
                Ok(())
            }
        }
    }
}
