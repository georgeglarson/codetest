use crate::error::CashRegisterError;

/// A validated transaction: how much was owed and how much was paid, in cents.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Transaction {
    pub owed_cents: u32,
    pub paid_cents: u32,
    pub change_cents: u32,
}

/// Parse a dollar-amount string like "2.13" into cents (213).
///
/// Uses string manipulation to avoid floating-point imprecision.
/// Accepts whole numbers ("3") and decimal numbers with 1-2 decimal places.
pub fn parse_dollars_to_cents(s: &str) -> Result<u32, String> {
    let s = s.trim();
    if s.is_empty() {
        return Err("empty string".to_string());
    }

    match s.split_once('.') {
        None => {
            // Whole number: "3" -> 300
            let dollars: u32 = s
                .parse()
                .map_err(|_| format!("not a valid number: \"{s}\""))?;
            dollars
                .checked_mul(100)
                .ok_or_else(|| format!("amount too large: \"{s}\""))
        }
        Some((dollars_str, cents_str)) => {
            if cents_str.is_empty() {
                return Err(format!("missing cents after decimal point: \"{s}\""));
            }
            if cents_str.len() > 2 {
                return Err(format!("too many decimal places: \"{s}\""));
            }

            let dollars: u32 = dollars_str
                .parse()
                .map_err(|_| format!("invalid dollar part: \"{s}\""))?;

            // Pad single digit: "3.1" means 10 cents, not 1 cent
            let padded = if cents_str.len() == 1 {
                format!("{cents_str}0")
            } else {
                cents_str.to_string()
            };

            let cents: u32 = padded
                .parse()
                .map_err(|_| format!("invalid cents part: \"{s}\""))?;

            dollars
                .checked_mul(100)
                .and_then(|d| d.checked_add(cents))
                .ok_or_else(|| format!("amount too large: \"{s}\""))
        }
    }
}

/// Parse a single line like "2.13,3.00" into a Transaction.
pub fn parse_line(line: &str, line_number: usize) -> Result<Transaction, CashRegisterError> {
    let line = line.trim();

    let (owed_str, paid_str) =
        line.split_once(',')
            .ok_or_else(|| CashRegisterError::MalformedLine {
                line: line_number,
                detail: format!("expected \"owed,paid\" but got \"{line}\""),
            })?;

    let owed_cents =
        parse_dollars_to_cents(owed_str).map_err(|_| CashRegisterError::InvalidAmount {
            line: line_number,
            input: owed_str.trim().to_string(),
        })?;

    let paid_cents =
        parse_dollars_to_cents(paid_str).map_err(|_| CashRegisterError::InvalidAmount {
            line: line_number,
            input: paid_str.trim().to_string(),
        })?;

    if paid_cents < owed_cents {
        return Err(CashRegisterError::Underpayment {
            line: line_number,
            owed: owed_str.trim().to_string(),
            paid: paid_str.trim().to_string(),
        });
    }

    Ok(Transaction {
        owed_cents,
        paid_cents,
        change_cents: paid_cents - owed_cents,
    })
}

/// Parse all lines from input text, skipping blank lines.
/// Returns a Vec of Results so one bad line doesn't prevent processing others.
pub fn parse_input(input: &str) -> Vec<Result<Transaction, CashRegisterError>> {
    input
        .lines()
        .enumerate()
        .filter(|(_, line)| !line.trim().is_empty())
        .map(|(i, line)| parse_line(line, i + 1))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_whole_dollars() {
        assert_eq!(parse_dollars_to_cents("3"), Ok(300));
        assert_eq!(parse_dollars_to_cents("0"), Ok(0));
        assert_eq!(parse_dollars_to_cents("100"), Ok(10_000));
    }

    #[test]
    fn parse_dollars_and_cents() {
        assert_eq!(parse_dollars_to_cents("2.13"), Ok(213));
        assert_eq!(parse_dollars_to_cents("3.00"), Ok(300));
        assert_eq!(parse_dollars_to_cents("0.01"), Ok(1));
        assert_eq!(parse_dollars_to_cents("0.50"), Ok(50));
    }

    #[test]
    fn parse_single_decimal_digit() {
        // "3.1" means $3.10
        assert_eq!(parse_dollars_to_cents("3.1"), Ok(310));
    }

    #[test]
    fn parse_with_whitespace() {
        assert_eq!(parse_dollars_to_cents("  2.13  "), Ok(213));
    }

    #[test]
    fn parse_rejects_too_many_decimals() {
        assert!(parse_dollars_to_cents("2.123").is_err());
    }

    #[test]
    fn parse_rejects_empty() {
        assert!(parse_dollars_to_cents("").is_err());
    }

    #[test]
    fn parse_rejects_non_numeric() {
        assert!(parse_dollars_to_cents("abc").is_err());
        assert!(parse_dollars_to_cents("1.ab").is_err());
    }

    #[test]
    fn parse_rejects_trailing_decimal() {
        let err = parse_dollars_to_cents("3.").unwrap_err();
        assert!(err.contains("missing cents after decimal point"), "got: {err}");
    }

    #[test]
    fn parse_rejects_leading_dot() {
        assert!(parse_dollars_to_cents(".50").is_err());
    }

    #[test]
    fn parse_rejects_multiple_decimals() {
        assert!(parse_dollars_to_cents("1.2.3").is_err());
    }

    #[test]
    fn parse_rejects_overflow() {
        let err = parse_dollars_to_cents("42949673").unwrap_err();
        assert!(err.contains("too large"), "got: {err}");
    }

    #[test]
    fn parse_rejects_overflow_with_cents() {
        let err = parse_dollars_to_cents("42949672.96").unwrap_err();
        assert!(err.contains("too large"), "got: {err}");
    }

    #[test]
    fn parse_line_valid() {
        let tx = parse_line("2.12,3.00", 1).unwrap();
        assert_eq!(tx.owed_cents, 212);
        assert_eq!(tx.paid_cents, 300);
        assert_eq!(tx.change_cents, 88);
    }

    #[test]
    fn parse_line_with_whitespace() {
        let tx = parse_line("  2.12 , 3.00  ", 1).unwrap();
        assert_eq!(tx.change_cents, 88);
    }

    #[test]
    fn parse_line_exact_payment() {
        let tx = parse_line("5.00,5.00", 1).unwrap();
        assert_eq!(tx.change_cents, 0);
    }

    #[test]
    fn parse_line_underpayment() {
        let result = parse_line("5.00,3.00", 1);
        assert!(matches!(
            result,
            Err(CashRegisterError::Underpayment { .. })
        ));
    }

    #[test]
    fn parse_line_missing_comma() {
        let result = parse_line("5.00", 1);
        assert!(matches!(
            result,
            Err(CashRegisterError::MalformedLine { .. })
        ));
    }

    #[test]
    fn parse_input_skips_blank_lines() {
        let input = "2.12,3.00\n\n1.97,2.00\n";
        let results = parse_input(input);
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|r| r.is_ok()));
    }

    #[test]
    fn parse_input_preserves_line_numbers() {
        let input = "\nbad\n2.12,3.00\n";
        let results = parse_input(input);
        assert_eq!(results.len(), 2);
        // The "bad" line is line 2 (1-indexed)
        match &results[0] {
            Err(CashRegisterError::MalformedLine { line, .. }) => assert_eq!(*line, 2),
            other => panic!("expected MalformedLine, got {:?}", other),
        }
    }

    #[test]
    fn parse_rejects_negative_amount() {
        let err = parse_dollars_to_cents("-2.13").unwrap_err();
        assert!(
            err.contains("invalid") || err.contains("not a valid"),
            "expected rejection of negative amount, got: {err}"
        );
    }

    #[test]
    fn parse_rejects_negative_penny() {
        let err = parse_dollars_to_cents("-0.01").unwrap_err();
        assert!(
            err.contains("invalid") || err.contains("not a valid"),
            "expected rejection of negative amount, got: {err}"
        );
    }

    #[test]
    fn parse_zero_dollars_and_cents() {
        assert_eq!(parse_dollars_to_cents("0.00"), Ok(0));
    }

    #[test]
    fn parse_near_overflow_boundary_ok() {
        // 42949672 * 100 + 95 = 4294967295 = u32::MAX
        assert_eq!(
            parse_dollars_to_cents("42949672.95"),
            Ok(u32::MAX),
            "42949672.95 should parse to u32::MAX (4294967295 cents)"
        );
    }

    #[test]
    fn parse_line_multiple_commas_errors() {
        let result = parse_line("2.13,,3.00", 1);
        assert!(
            result.is_err(),
            "multiple commas should produce an error, got: {:?}",
            result
        );
    }

    #[test]
    fn parse_line_zero_payment() {
        let tx = parse_line("0.00,0.00", 1).unwrap();
        assert_eq!(tx.owed_cents, 0);
        assert_eq!(tx.paid_cents, 0);
        assert_eq!(tx.change_cents, 0);
    }

    #[test]
    fn parse_input_all_blank_lines() {
        let results = parse_input("\n\n\n");
        assert!(
            results.is_empty(),
            "all-blank input should produce empty vec, got {} results",
            results.len()
        );
    }

    #[test]
    fn parse_input_line_numbering_after_multiple_blanks() {
        // Lines: 1="", 2="", 3="bad_line", 4=""
        let input = "\n\nbad_line\n";
        let results = parse_input(input);
        assert_eq!(results.len(), 1);
        match &results[0] {
            Err(CashRegisterError::MalformedLine { line, .. }) => {
                assert_eq!(*line, 3, "expected line 3, got {line}");
            }
            other => panic!("expected MalformedLine for line 3, got {:?}", other),
        }
    }
}
