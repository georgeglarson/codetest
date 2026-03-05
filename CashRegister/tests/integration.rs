use std::process::Command;

fn cargo_bin() -> Command {
    let mut cmd = Command::new("cargo");
    cmd.args(["run", "--quiet", "--"]);
    cmd.current_dir(env!("CARGO_MANIFEST_DIR"));
    cmd
}

// ─── Sample input tests ─────────────────────────────────────────────

#[test]
fn sample_input_greedy_lines() {
    // Lines where owed is NOT divisible by 3 should produce deterministic output.
    // 2.12 -> 212, 212 % 3 != 0 -> greedy: 88 cents = 3 quarters, 1 dime, 3 pennies
    // 1.97 -> 197, 197 % 3 != 0 -> greedy: 3 cents = 3 pennies
    // 3.33 -> 333, 333 % 3 == 0 -> random (skip checking this line)
    let output = cargo_bin()
        .arg("sample_input.txt")
        .arg("--seed")
        .arg("42")
        .output()
        .expect("failed to run binary");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    assert_eq!(lines.len(), 3, "expected 3 output lines, got: {stdout:?}");
    assert_eq!(lines[0], "3 quarters,1 dime,3 pennies");
    assert_eq!(lines[1], "3 pennies");
    // Line 3 is random — just verify it's non-empty
    assert!(!lines[2].is_empty(), "random line should not be empty");
}

#[test]
fn seed_produces_deterministic_output() {
    let run = |seed: &str| -> String {
        let output = cargo_bin()
            .args(["sample_input.txt", "--seed", seed])
            .output()
            .expect("failed to run binary");
        String::from_utf8_lossy(&output.stdout).to_string()
    };

    let first = run("99");
    let second = run("99");
    assert_eq!(first, second, "same seed should produce identical output");
}

#[test]
fn custom_divisor() {
    // With --divisor 0, no lines are random, so all output is greedy
    let output = cargo_bin()
        .args(["sample_input.txt", "--divisor", "0"])
        .output()
        .expect("failed to run binary");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    assert_eq!(lines.len(), 3);
    assert_eq!(lines[0], "3 quarters,1 dime,3 pennies");
    assert_eq!(lines[1], "3 pennies");
    // With divisor 0, line 3 should also be greedy: 167 = 1 dollar,2 quarters,1 dime,1 nickel,2 pennies
    assert_eq!(lines[2], "1 dollar,2 quarters,1 dime,1 nickel,2 pennies");
}

#[test]
fn random_line_sums_correctly() {
    // 3.33,5.00 -> 167 cents of change, owed 333 which is divisible by 3
    let output = cargo_bin()
        .args(["sample_input.txt", "--seed", "42"])
        .output()
        .expect("failed to run binary");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let random_line = stdout.lines().nth(2).expect("expected 3 lines");

    let total = parse_output_cents(random_line);
    assert_eq!(
        total, 167,
        "random change should sum to 167 cents (got {total})"
    );
}

// ─── Edge case tests ────────────────────────────────────────────────

#[test]
fn exact_payment_outputs_no_change() {
    let output = cargo_bin()
        .args(["sample_edge_cases.txt", "--divisor", "0"])
        .output()
        .expect("failed to run binary");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    // 5.00,5.00 -> exact payment
    assert_eq!(lines[0], "no change");
}

#[test]
fn edge_cases_greedy_output() {
    let output = cargo_bin()
        .args(["sample_edge_cases.txt", "--divisor", "0"])
        .output()
        .expect("failed to run binary");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    assert_eq!(lines.len(), 6);
    assert_eq!(lines[0], "no change"); // 5.00,5.00
    assert_eq!(lines[1], "3 quarters,2 dimes,4 pennies"); // 0.01,1.00 = 99c
    assert_eq!(lines[2], "100 dollars"); // 100.00,200.00 = $100
    assert_eq!(lines[3], "3 pennies"); // 1.97,2.00
    assert_eq!(lines[4], "2 dollars"); // 3.00,5.00
    assert_eq!(lines[5], "1 quarter"); // 0.75,1.00
}

// ─── EUR end-to-end tests ───────────────────────────────────────────

#[test]
fn eur_greedy_output() {
    let output = cargo_bin()
        .args(["sample_eur.txt", "--currency", "EUR", "--divisor", "0"])
        .output()
        .expect("failed to run binary");

    assert!(
        output.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    assert_eq!(lines.len(), 4);
    assert_eq!(lines[0], "1 50 cent coin"); // 1.50,2.00 = 50c
    assert_eq!(
        lines[1],
        "1 1 euro coin,1 50 cent coin,1 10 cent coin,1 5 cent coin,1 2 cent coin"
    ); // 3.33,5.00 = 167c
    assert_eq!(
        lines[2],
        "1 50 cent coin,1 10 cent coin,1 2 cent coin,1 1 cent coin"
    ); // 0.37,1.00 = 63c
    assert_eq!(
        lines[3],
        "1 2 euro coin,1 20 cent coin,1 2 cent coin,1 1 cent coin"
    ); // 7.77,10.00 = 223c
}

#[test]
fn eur_random_sums_correctly() {
    // 3.33 -> 333, divisible by 3, so random with EUR
    let output = cargo_bin()
        .args(["sample_eur.txt", "--currency", "EUR", "--seed", "42"])
        .output()
        .expect("failed to run binary");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let random_line = stdout.lines().nth(1).expect("expected 4 lines"); // line 2 is 3.33,5.00

    let total = parse_eur_output_cents(random_line);
    assert_eq!(
        total, 167,
        "EUR random change should sum to 167 cents (got {total})"
    );
}

#[test]
fn unknown_currency_fails() {
    let output = cargo_bin()
        .args(["sample_input.txt", "--currency", "GBP"])
        .output()
        .expect("failed to run binary");

    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("Unknown currency"),
        "expected currency error, got: {stderr}"
    );
}

// ─── Error handling tests ───────────────────────────────────────────

#[test]
fn missing_file_returns_nonzero_exit() {
    let output = cargo_bin()
        .arg("nonexistent.txt")
        .output()
        .expect("failed to run binary");

    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("Error reading"),
        "expected file error message, got: {stderr}"
    );
}

#[test]
fn no_args_shows_usage() {
    let output = Command::new("cargo")
        .args(["run", "--quiet"])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .expect("failed to run binary");

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("Usage"), "should show usage message");
    assert!(!output.status.success());
}

#[test]
fn underpayment_reports_error_to_stderr() {
    // Write a temp file with an underpayment line
    let dir = env!("CARGO_MANIFEST_DIR");
    let path = format!("{dir}/test_underpayment.txt");
    std::fs::write(&path, "5.00,3.00\n").unwrap();

    let output = cargo_bin()
        .arg(&path)
        .output()
        .expect("failed to run binary");

    std::fs::remove_file(&path).ok();

    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("paid"),
        "expected underpayment error, got: {stderr}"
    );
    assert!(
        stderr.contains("less than"),
        "expected underpayment message, got: {stderr}"
    );
}

#[test]
fn malformed_line_reports_error_with_line_number() {
    let dir = env!("CARGO_MANIFEST_DIR");
    let path = format!("{dir}/test_malformed.txt");
    std::fs::write(&path, "2.12,3.00\nbad_line\n1.97,2.00\n").unwrap();

    let output = cargo_bin()
        .arg(&path)
        .output()
        .expect("failed to run binary");

    std::fs::remove_file(&path).ok();

    // Should still process valid lines
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert_eq!(stdout.lines().count(), 2, "should output 2 valid lines");

    // Should report error for line 2
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("line 2"),
        "expected line number in error, got: {stderr}"
    );

    // Should exit with error code
    assert!(!output.status.success());
}

#[test]
fn mixed_valid_and_invalid_processes_all() {
    let dir = env!("CARGO_MANIFEST_DIR");
    let path = format!("{dir}/test_mixed.txt");
    std::fs::write(&path, "1.00,2.00\nabc,def\n0.50,1.00\n").unwrap();

    let output = cargo_bin()
        .args([&path, "--divisor", "0"])
        .output()
        .expect("failed to run binary");

    std::fs::remove_file(&path).ok();

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Valid lines still produce output
    let lines: Vec<&str> = stdout.lines().collect();
    assert_eq!(lines.len(), 2);
    assert_eq!(lines[0], "1 dollar");
    assert_eq!(lines[1], "2 quarters");

    // Bad line reported to stderr
    assert!(stderr.contains("line 2"), "error should reference line 2");
    assert!(!output.status.success());
}

// ─── Verbose mode tests ─────────────────────────────────────────────

#[test]
fn verbose_shows_transaction_context() {
    let output = cargo_bin()
        .args(["sample_input.txt", "--divisor", "0", "--verbose"])
        .output()
        .expect("failed to run binary");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    assert_eq!(lines.len(), 3);
    assert_eq!(
        lines[0],
        "Owed $2.12, Paid $3.00 -> 3 quarters,1 dime,3 pennies"
    );
    assert_eq!(lines[1], "Owed $1.97, Paid $2.00 -> 3 pennies");
    assert_eq!(
        lines[2],
        "Owed $3.33, Paid $5.00 -> 1 dollar,2 quarters,1 dime,1 nickel,2 pennies"
    );
}

#[test]
fn verbose_labels_random_lines() {
    let output = cargo_bin()
        .args(["sample_input.txt", "--seed", "42", "--verbose"])
        .output()
        .expect("failed to run binary");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    // Lines 1 and 2 are greedy — no "(random)" label
    assert!(
        !lines[0].contains("(random)"),
        "greedy line should not be labeled random"
    );
    assert!(
        !lines[1].contains("(random)"),
        "greedy line should not be labeled random"
    );
    // Line 3 (owed $3.33, divisible by 3) should be labeled random
    assert!(
        lines[2].contains("(random)"),
        "random line should be labeled: {}",
        lines[2]
    );
    assert!(lines[2].starts_with("Owed $3.33, Paid $5.00 -> "));
}

#[test]
fn verbose_edge_cases() {
    let output = cargo_bin()
        .args(["sample_edge_cases.txt", "--divisor", "0", "--verbose"])
        .output()
        .expect("failed to run binary");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    assert_eq!(lines[0], "Owed $5.00, Paid $5.00 -> no change");
    assert_eq!(
        lines[1],
        "Owed $0.01, Paid $1.00 -> 3 quarters,2 dimes,4 pennies"
    );
    assert_eq!(lines[2], "Owed $100.00, Paid $200.00 -> 100 dollars");
}

#[test]
fn verbose_eur() {
    let output = cargo_bin()
        .args([
            "sample_eur.txt",
            "--currency",
            "EUR",
            "--divisor",
            "0",
            "--verbose",
        ])
        .output()
        .expect("failed to run binary");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    assert_eq!(lines[0], "Owed €1.50, Paid €2.00 -> 1 50 cent coin");
    assert!(lines[1].starts_with("Owed €3.33, Paid €5.00 -> "));
}

// ─── Negative amount tests ──────────────────────────────────────────

#[test]
fn negative_amount_errors() {
    let dir = env!("CARGO_MANIFEST_DIR");
    let path = format!("{dir}/test_negative.txt");
    std::fs::write(&path, "-2.13,3.00\n").unwrap();

    let output = cargo_bin()
        .arg(&path)
        .output()
        .expect("failed to run binary");

    std::fs::remove_file(&path).ok();

    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("line 1"),
        "expected line number in error, got: {stderr}"
    );
    // stdout should be empty — no valid lines
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.is_empty(), "expected no stdout, got: {stdout}");
}

#[test]
fn exit_code_is_2_on_line_error() {
    let dir = env!("CARGO_MANIFEST_DIR");
    let path = format!("{dir}/test_exit2.txt");
    std::fs::write(&path, "bad_line\n").unwrap();

    let output = cargo_bin()
        .arg(&path)
        .output()
        .expect("failed to run binary");

    std::fs::remove_file(&path).ok();

    assert_eq!(
        output.status.code(),
        Some(2),
        "expected exit code 2, got: {:?}",
        output.status.code()
    );
}

#[test]
fn exit_code_is_0_on_success() {
    let output = cargo_bin()
        .args(["sample_input.txt", "--seed", "42"])
        .output()
        .expect("failed to run binary");

    assert_eq!(
        output.status.code(),
        Some(0),
        "expected exit code 0, got: {:?}",
        output.status.code()
    );
}

#[test]
fn empty_input_produces_no_output_and_exits_0() {
    let dir = env!("CARGO_MANIFEST_DIR");
    let path = format!("{dir}/test_empty.txt");
    std::fs::write(&path, "\n\n").unwrap();

    let output = cargo_bin()
        .arg(&path)
        .output()
        .expect("failed to run binary");

    std::fs::remove_file(&path).ok();

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stdout.is_empty(), "expected no stdout, got: {stdout}");
    assert!(stderr.is_empty(), "expected no stderr, got: {stderr}");
    assert_eq!(
        output.status.code(),
        Some(0),
        "expected exit code 0, got: {:?}",
        output.status.code()
    );
}

#[test]
fn invalid_seed_flag_is_silently_ignored() {
    // --seed abc cannot be parsed as u64, so parse_flag returns None
    // and the program runs with a random (non-seeded) RNG — no error.
    let output = cargo_bin()
        .args(["sample_input.txt", "--seed", "abc"])
        .output()
        .expect("failed to run binary");

    assert!(
        output.status.success(),
        "bad --seed should not crash; stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert_eq!(
        stdout.lines().count(),
        3,
        "should still produce 3 output lines"
    );
}

#[test]
fn missing_divisor_value_uses_default() {
    // --divisor is the last arg with no value following it.
    // parse_flag returns None, so divisor defaults to 3.
    let output = cargo_bin()
        .args(["sample_input.txt", "--divisor"])
        .output()
        .expect("failed to run binary");

    assert!(
        output.status.success(),
        "missing --divisor value should fall back to default; stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert_eq!(
        stdout.lines().count(),
        3,
        "should still produce 3 output lines"
    );
}

#[test]
fn all_lines_invalid_gives_empty_stdout_and_stderr_errors() {
    let dir = env!("CARGO_MANIFEST_DIR");
    let path = format!("{dir}/test_all_bad.txt");
    std::fs::write(&path, "bad\nalso_bad\nstill_bad\n").unwrap();

    let output = cargo_bin()
        .arg(&path)
        .output()
        .expect("failed to run binary");

    std::fs::remove_file(&path).ok();

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    assert!(stdout.is_empty(), "expected no stdout, got: {stdout}");
    assert!(
        stderr.contains("line 1"),
        "expected line 1 error, got: {stderr}"
    );
    assert!(
        stderr.contains("line 2"),
        "expected line 2 error, got: {stderr}"
    );
    assert!(
        stderr.contains("line 3"),
        "expected line 3 error, got: {stderr}"
    );
    assert!(!output.status.success());
    assert_eq!(output.status.code(), Some(2));
}

// ─── Helpers ────────────────────────────────────────────────────────

/// Parse a USD output line like "1 dollar,2 quarters,1 nickel,2 pennies" into total cents.
fn parse_output_cents(line: &str) -> u32 {
    line.split(',')
        .map(|part| {
            let part = part.trim();
            let (count_str, name) = part.split_once(' ').expect("expected 'N name' format");
            let count: u32 = count_str.parse().expect("expected numeric count");
            let cents_per = match name {
                "dollar" | "dollars" => 100,
                "quarter" | "quarters" => 25,
                "dime" | "dimes" => 10,
                "nickel" | "nickels" => 5,
                "penny" | "pennies" => 1,
                other => panic!("unknown denomination: {other}"),
            };
            count * cents_per
        })
        .sum()
}

/// Parse a EUR output line into total cents.
fn parse_eur_output_cents(line: &str) -> u32 {
    // EUR format: "1 2 euro coin,2 50 cent coins,..." — split on comma,
    // then the first token is the count, the rest is the denomination name.
    line.split(',')
        .map(|part| {
            let part = part.trim();
            let (count_str, name) = part.split_once(' ').expect("expected 'N name' format");
            let count: u32 = count_str.parse().expect("expected numeric count");
            let cents_per = match name {
                "2 euro coin" | "2 euro coins" => 200,
                "1 euro coin" | "1 euro coins" => 100,
                "50 cent coin" | "50 cent coins" => 50,
                "20 cent coin" | "20 cent coins" => 20,
                "10 cent coin" | "10 cent coins" => 10,
                "5 cent coin" | "5 cent coins" => 5,
                "2 cent coin" | "2 cent coins" => 2,
                "1 cent coin" | "1 cent coins" => 1,
                other => panic!("unknown EUR denomination: {other}"),
            };
            count * cents_per
        })
        .sum()
}
