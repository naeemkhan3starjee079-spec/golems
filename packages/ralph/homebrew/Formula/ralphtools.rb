# typed: false
# frozen_string_literal: true

class Ralphtools < Formula
  desc "Autonomous coding loop for executing PRD stories with AI models"
  homepage "https://github.com/EtanHey/ralphtools"
  url "https://github.com/EtanHey/ralphtools/archive/refs/tags/v1.4.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256"
  license "MIT"

  depends_on "jq"

  def install
    # Install main script
    bin.install "ralph.zsh" => "ralph"

    # Install supporting files
    (share/"ralphtools").install Dir["skills/*"]
    (share/"ralphtools").install Dir["schemas/*"]
    (share/"ralphtools/scripts").install Dir["scripts/*"]

    # Install docs
    (share/"ralphtools/docs").install Dir["docs/*"]

    # Create config directory reference
    (etc/"ralphtools").mkpath
  end

  def post_install
    # Create user config directory if it doesn't exist
    config_dir = Pathname.new(Dir.home)/".config/ralphtools"
    config_dir.mkpath unless config_dir.exist?
  end

  def caveats
    <<~EOS
      To get started:
        ralph --help

      Configuration is stored in:
        ~/.config/ralphtools/config.json

      First run will prompt you to configure model settings.

      For full MCP support, ensure you have Claude CLI installed:
        https://docs.anthropic.com/claude-code
    EOS
  end

  test do
    assert_match "ralphtools", shell_output("#{bin}/ralph --version")
  end
end
