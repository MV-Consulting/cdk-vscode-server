#!/bin/bash

echo "[DEBUG] Running file checker..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Find the most recently modified source file (exclude cache files and generated files)
files=$(find . -type f -mmin -1 \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/lib/*" -not -path "*/dist/*" -not -path "*/coverage/*" -not -path "*/test-reports/*" -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2)
if [[ -z $files ]]; then
	echo "No modified source files found."
	exit 2
fi

# Check if qlty is available and initialized
qlty_available=false
if command -v qlty >/dev/null 2>&1 && [[ -d ".qlty" ]]; then
	qlty_available=true
fi

# Auto-format TypeScript/JavaScript files with eslint --fix first
eslint_format_applied=false
if [[ $files == *.ts ]] || [[ $files == *.tsx ]] || [[ $files == *.js ]] || [[ $files == *.jsx ]]; then
	# Try projen eslint first if available
	if command -v npx >/dev/null 2>&1 && [[ -f "package.json" ]] && grep -q "projen" package.json; then
		eslint_fix_output=$(npx projen eslint --fix "$files" 2>&1)
		if [[ $eslint_fix_output == *"fixed"* ]] || [[ $eslint_fix_output == *"formatted"* ]]; then
			eslint_format_applied=true
		fi
	elif command -v eslint >/dev/null 2>&1; then
		# Fallback to direct eslint
		eslint_fix_output=$(eslint --fix "$files" 2>&1)
		if [[ $eslint_fix_output == *"fixed"* ]] || [[ $eslint_fix_output == *"formatted"* ]]; then
			eslint_format_applied=true
		fi
	fi
fi

# Run qlty checks (only if available)
fmt_output=""
check_output=""
check_exit_code=0
if [[ $qlty_available == true ]]; then
	fmt_output=$(qlty fmt "$files" 2>&1)
	check_output=$(qlty check --fix $files 2>&1)
	check_exit_code=$?
fi

# Run additional TypeScript/JavaScript tools
eslint_output=""
tsc_output=""
awslint_output=""
eslint_exit_code=0
tsc_exit_code=0
awslint_exit_code=0

if [[ $files == *.ts ]] || [[ $files == *.tsx ]] || [[ $files == *.js ]] || [[ $files == *.jsx ]]; then
	# Run eslint (linting check without fix)
	if command -v npx >/dev/null 2>&1 && [[ -f "package.json" ]] && grep -q "projen" package.json; then
		eslint_output=$(npx projen eslint "$files" 2>&1)
		eslint_exit_code=$?
	elif command -v eslint >/dev/null 2>&1; then
		eslint_output=$(eslint "$files" 2>&1)
		eslint_exit_code=$?
	fi

	# Run TypeScript compiler check for .ts/.tsx files
	if [[ $files == *.ts ]] || [[ $files == *.tsx ]]; then
		if command -v tsc >/dev/null 2>&1; then
			tsc_output=$(tsc --noEmit --skipLibCheck 2>&1)
			tsc_exit_code=$?
		fi
	fi

	# Run awslint for CDK projects (check if this is a CDK project)
	if [[ -f "package.json" ]] && grep -q "aws-cdk" package.json; then
		if command -v awslint >/dev/null 2>&1; then
			awslint_output=$(awslint 2>&1)
			awslint_exit_code=$?
		elif command -v npx >/dev/null 2>&1; then
			awslint_output=$(npm run awslint 2>&1)
			awslint_exit_code=$?
		fi
	fi
fi

# Check for issues
has_issues=false

# Check if formatting happened (this is auto-fixed, so don't count as issue)
formatting_applied=false
if [[ $fmt_output == *"Formatted"* ]]; then
	formatting_applied=true
fi

# Check if linting found issues
if [[ $qlty_available == true ]]; then
	if [[ $check_output != *"No issues"* ]] || [[ $check_exit_code -ne 0 ]]; then
		has_issues=true
	fi
fi

# Check TypeScript/JavaScript tool issues
if [[ $eslint_exit_code -ne 0 ]] || [[ $tsc_exit_code -ne 0 ]] || [[ $awslint_exit_code -ne 0 ]]; then
	has_issues=true
fi

# Remove test logic - now using real qlty detection

# Display results
if [[ $has_issues == true ]]; then
	echo -e "${RED}🛑 STOP - Issues found in: $files${NC}" >&2
	echo -e "${RED}The following MUST BE FIXED:${NC}" >&2
	echo "" >&2

	if [[ $qlty_available == true ]] && [[ $check_output != *"No issues"* ]]; then
		# Extract remaining issue lines (skip headers/footers)
		issue_lines=$(echo "$check_output" | grep -E "^\s*[0-9]+:[0-9]+\s+|high\s+|medium\s+|low\s+" | head -3)
		remaining_issues=$(echo "$check_output" | grep -c "high\|medium\|low" 2>/dev/null || echo "0")

		# Ensure remaining_issues is a valid number
		if ! [[ $remaining_issues =~ ^[0-9]+$ ]]; then
			remaining_issues=0
		fi

		# Simple, clear output
		echo "🔍 QLTY Issues: ($remaining_issues remaining)" >&2

		if [[ -n $issue_lines ]]; then
			echo "$issue_lines" >&2
			if [[ $remaining_issues -gt 3 ]]; then
				echo "... and $((remaining_issues - 3)) more issues" >&2
			fi
		else
			# Fallback: show first few lines if parsing failed
			echo "$check_output" | head -5 >&2
		fi
		echo "" >&2
	fi

	# Show eslint issues
	if [[ $eslint_exit_code -ne 0 ]] && [[ -n $eslint_output ]]; then
		echo "🔍 ESLint Issues:" >&2
		echo "$eslint_output" | head -5 >&2
		echo "" >&2
	fi

	# Show TypeScript issues
	if [[ $tsc_exit_code -ne 0 ]] && [[ -n $tsc_output ]]; then
		echo "🔍 TypeScript Issues:" >&2
		echo "$tsc_output" | grep -E "error|warning" | head -5 >&2
		echo "" >&2
	fi

	# Show awslint issues
	if [[ $awslint_exit_code -ne 0 ]] && [[ -n $awslint_output ]]; then
		echo "🔍 AWS CDK Lint Issues:" >&2
		echo "$awslint_output" | grep -E "error|warning" | head -5 >&2
		echo "" >&2
	fi

	echo -e "${RED}Fix all issues above before continuing${NC}" >&2
	exit 1
else
	if [[ $eslint_format_applied == true ]] && [[ $formatting_applied == true ]]; then
		echo -e "${GREEN}✅ ESLint + QLTY formatted $files. Code quality good. Continue${NC}" >&2
	elif [[ $eslint_format_applied == true ]]; then
		echo -e "${GREEN}✅ ESLint formatted $files. Code quality good. Continue${NC}" >&2
	elif [[ $formatting_applied == true ]]; then
		echo -e "${GREEN}✅ QLTY formatted $files. Code quality good. Continue${NC}" >&2
	else
		echo -e "${GREEN}✅ Code quality good for $files. Continue${NC}" >&2
	fi
	exit 2
fi