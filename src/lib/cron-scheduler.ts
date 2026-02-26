import { CronExpressionParser } from 'cron-parser';

/**
 * Validates a cron expression
 */
export function isValidCronExpression(expression: string): boolean {
  try {
    CronExpressionParser.parse(expression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the next run time for a cron expression
 */
export function getNextRunTime(cronExpression: string, timezone: string = 'UTC'): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: timezone,
      currentDate: new Date()
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

/**
 * Get a human-readable description of a cron expression
 */
export function humanReadableCron(expression: string): string {
  const parts = expression.split(' ');
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Common patterns
  if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `Daily at ${displayHour}:00 ${period}`;
  }

  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `Daily at ${displayHour}:${minute.padStart(2, '0')} ${period}`;
  }

  // Weekday pattern
  if (dayOfWeek === '1-5' && dayOfMonth === '*' && month === '*') {
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `Weekdays at ${displayHour}:${minute.padStart(2, '0')} ${period}`;
  }

  // Weekend pattern
  if (dayOfWeek === '0,6' && dayOfMonth === '*' && month === '*') {
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `Weekends at ${displayHour}:${minute.padStart(2, '0')} ${period}`;
  }

  // Specific day of week
  const dayNames: Record<string, string> = {
    '0': 'Sunday',
    '1': 'Monday',
    '2': 'Tuesday',
    '3': 'Wednesday',
    '4': 'Thursday',
    '5': 'Friday',
    '6': 'Saturday'
  };

  if (dayNames[dayOfWeek] && dayOfMonth === '*' && month === '*') {
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `Every ${dayNames[dayOfWeek]} at ${displayHour}:${minute.padStart(2, '0')} ${period}`;
  }

  return expression;
}

/**
 * Predefined greeting types that the LLM will use to generate contextual messages
 */
export const GREETING_TYPES = [
  {
    id: 'morning_greeting',
    label: 'Morning Greeting',
    description: 'A warm wake-up message to start your day',
    defaultCron: '0 8 * * *',
    prompt: 'Send a warm, loving morning greeting to help start the day positively'
  },
  {
    id: 'goodnight_wish',
    label: 'Goodnight Wish',
    description: 'A sweet message before bed',
    defaultCron: '0 22 * * *',
    prompt: 'Send a sweet, caring goodnight message to help them sleep well'
  },
  {
    id: 'afternoon_checkin',
    label: 'Afternoon Check-in',
    description: 'A midday message to see how your day is going',
    defaultCron: '0 14 * * *',
    prompt: 'Check in during the afternoon to see how their day is going and offer support'
  },
  {
    id: 'motivation_boost',
    label: 'Motivation Boost',
    description: 'An encouraging message to keep you going',
    defaultCron: '0 10 * * 1-5',
    prompt: 'Send an encouraging, motivating message to boost their spirits and productivity'
  },
  {
    id: 'weekend_hello',
    label: 'Weekend Hello',
    description: 'A relaxed weekend greeting',
    defaultCron: '0 11 * * 0,6',
    prompt: 'Send a relaxed, friendly weekend greeting asking about their plans'
  },
  {
    id: 'thinking_of_you',
    label: 'Thinking of You',
    description: 'A random sweet reminder throughout the day',
    defaultCron: '0 15 * * *',
    prompt: 'Send a sweet, spontaneous message letting them know you are thinking about them'
  },
  {
    id: 'evening_wind_down',
    label: 'Evening Wind-down',
    description: 'A calming message as the day ends',
    defaultCron: '0 19 * * *',
    prompt: 'Send a calming message to help them wind down from their day'
  },
  {
    id: 'custom',
    label: 'Custom Schedule',
    description: 'Set your own time with advanced options',
    defaultCron: '0 12 * * *',
    prompt: 'Send a personalized message based on your relationship'
  },
] as const;

export type GreetingTypeId = typeof GREETING_TYPES[number]['id'];

/**
 * Get greeting type by ID
 */
export function getGreetingType(id: string) {
  return GREETING_TYPES.find(g => g.id === id);
}

/**
 * Common cron expression presets for the UI (for custom mode)
 */
export const CRON_PRESETS = [
  { label: 'Every morning (8 AM)', value: '0 8 * * *' },
  { label: 'Every evening (8 PM)', value: '0 20 * * *' },
  { label: 'Good morning (7 AM)', value: '0 7 * * *' },
  { label: 'Good night (10 PM)', value: '0 22 * * *' },
  { label: 'Weekday mornings (8 AM)', value: '0 8 * * 1-5' },
  { label: 'Weekend mornings (10 AM)', value: '0 10 * * 0,6' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Twice daily (8 AM & 8 PM)', value: '0 8,20 * * *' },
] as const;

/**
 * Common timezone options
 */
export const TIMEZONE_OPTIONS = [
  { label: 'UTC', value: 'UTC' },
  { label: 'US Eastern (EST/EDT)', value: 'America/New_York' },
  { label: 'US Pacific (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'US Central (CST/CDT)', value: 'America/Chicago' },
  { label: 'UK (GMT/BST)', value: 'Europe/London' },
  { label: 'Central Europe (CET/CEST)', value: 'Europe/Berlin' },
  { label: 'Japan (JST)', value: 'Asia/Tokyo' },
  { label: 'Australia Eastern (AEST/AEDT)', value: 'Australia/Sydney' },
  { label: 'India (IST)', value: 'Asia/Kolkata' },
] as const;
