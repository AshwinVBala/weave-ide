use clap::Parser;
use weave_core::cli::Cli;

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    if let Err(err) = cli.run().await {
        eprintln!("{}", err);
        std::process::exit(1);
    }
}

