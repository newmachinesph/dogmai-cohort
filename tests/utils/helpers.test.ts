import { describe, it, expect } from 'vitest';

// Test helper functions - these would typically be imported from a utils file
// For now, we'll define some common utility functions and test them

// Slug generation utility
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Date formatting utilities
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isDateInPast(date: Date | string): boolean {
  return new Date(date) < new Date();
}

function isDateInFuture(date: Date | string): boolean {
  return new Date(date) > new Date();
}

function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// String utilities
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map((word) => capitalizeFirst(word))
    .join(' ');
}

// Number utilities
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

// Status utilities
function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    COMPLETED: 'green',
    ACTIVE: 'blue',
    UPCOMING: 'yellow',
    CANCELLED: 'red',
    ON_HOLD: 'orange',
    DRAFT: 'gray',
  };
  return statusColors[status] || 'gray';
}

function getGradeLabel(score: number, maxScore: number): string {
  const percentage = calculatePercentage(score, maxScore);
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

describe('Helper Utilities', () => {
  describe('generateSlug', () => {
    it('converts text to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(generateSlug('Hello! World?')).toBe('hello-world');
    });

    it('replaces multiple spaces with single dash', () => {
      expect(generateSlug('Hello   World')).toBe('hello-world');
    });

    it('handles already slugified text', () => {
      expect(generateSlug('hello-world')).toBe('hello-world');
    });

    it('handles empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('trims whitespace', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
    });

    it('handles complex strings', () => {
      expect(generateSlug('Week 1-2: Web Development Foundations'))
        .toBe('week-1-2-web-development-foundations');
    });
  });

  describe('Date Utilities', () => {
    describe('formatDate', () => {
      it('formats date to readable string', () => {
        const date = new Date('2026-01-15');
        const formatted = formatDate(date);
        expect(formatted).toContain('Jan');
        expect(formatted).toContain('15');
        expect(formatted).toContain('2026');
      });

      it('handles string input', () => {
        const formatted = formatDate('2026-01-15');
        expect(formatted).toBeDefined();
      });
    });

    describe('formatDateTime', () => {
      it('formats date and time', () => {
        const date = new Date('2026-01-15T10:30:00');
        const formatted = formatDateTime(date);
        expect(formatted).toContain('Jan');
        expect(formatted).toContain('15');
        expect(formatted).toContain('2026');
      });
    });

    describe('isDateInPast', () => {
      it('returns true for past dates', () => {
        expect(isDateInPast('2020-01-01')).toBe(true);
      });

      it('returns false for future dates', () => {
        expect(isDateInPast('2030-01-01')).toBe(false);
      });
    });

    describe('isDateInFuture', () => {
      it('returns true for future dates', () => {
        expect(isDateInFuture('2030-01-01')).toBe(true);
      });

      it('returns false for past dates', () => {
        expect(isDateInFuture('2020-01-01')).toBe(false);
      });
    });

    describe('daysBetween', () => {
      it('calculates days between two dates', () => {
        const days = daysBetween('2026-01-01', '2026-01-10');
        expect(days).toBe(9);
      });

      it('returns positive value regardless of order', () => {
        const days = daysBetween('2026-01-10', '2026-01-01');
        expect(days).toBe(9);
      });
    });
  });

  describe('String Utilities', () => {
    describe('truncateText', () => {
      it('returns text unchanged if under max length', () => {
        expect(truncateText('Hello', 10)).toBe('Hello');
      });

      it('truncates text and adds ellipsis', () => {
        expect(truncateText('Hello World', 8)).toBe('Hello...');
      });

      it('handles empty string', () => {
        expect(truncateText('', 10)).toBe('');
      });
    });

    describe('capitalizeFirst', () => {
      it('capitalizes first letter', () => {
        expect(capitalizeFirst('hello')).toBe('Hello');
      });

      it('handles empty string', () => {
        expect(capitalizeFirst('')).toBe('');
      });

      it('handles already capitalized', () => {
        expect(capitalizeFirst('HELLO')).toBe('Hello');
      });
    });

    describe('capitalizeWords', () => {
      it('capitalizes each word', () => {
        expect(capitalizeWords('hello world')).toBe('Hello World');
      });

      it('handles single word', () => {
        expect(capitalizeWords('hello')).toBe('Hello');
      });
    });
  });

  describe('Number Utilities', () => {
    describe('formatNumber', () => {
      it('formats large numbers with commas', () => {
        expect(formatNumber(1000)).toBe('1,000');
        expect(formatNumber(1000000)).toBe('1,000,000');
      });

      it('handles small numbers', () => {
        expect(formatNumber(100)).toBe('100');
      });
    });

    describe('formatPercentage', () => {
      it('formats percentage with default decimals', () => {
        expect(formatPercentage(75.567)).toBe('75.6%');
      });

      it('formats percentage with custom decimals', () => {
        expect(formatPercentage(75.567, 2)).toBe('75.57%');
      });
    });

    describe('calculatePercentage', () => {
      it('calculates correct percentage', () => {
        expect(calculatePercentage(50, 100)).toBe(50);
        expect(calculatePercentage(25, 100)).toBe(25);
      });

      it('handles division by zero', () => {
        expect(calculatePercentage(50, 0)).toBe(0);
      });
    });
  });

  describe('Status Utilities', () => {
    describe('getStatusColor', () => {
      it('returns correct colors for known statuses', () => {
        expect(getStatusColor('COMPLETED')).toBe('green');
        expect(getStatusColor('ACTIVE')).toBe('blue');
        expect(getStatusColor('UPCOMING')).toBe('yellow');
        expect(getStatusColor('CANCELLED')).toBe('red');
      });

      it('returns gray for unknown status', () => {
        expect(getStatusColor('UNKNOWN')).toBe('gray');
      });
    });

    describe('getGradeLabel', () => {
      it('returns correct grade labels', () => {
        expect(getGradeLabel(95, 100)).toBe('A');
        expect(getGradeLabel(85, 100)).toBe('B');
        expect(getGradeLabel(75, 100)).toBe('C');
        expect(getGradeLabel(65, 100)).toBe('D');
        expect(getGradeLabel(55, 100)).toBe('F');
      });

      it('handles edge cases', () => {
        expect(getGradeLabel(90, 100)).toBe('A');
        expect(getGradeLabel(80, 100)).toBe('B');
        expect(getGradeLabel(60, 100)).toBe('D');
      });
    });
  });
});
