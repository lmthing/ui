import type { FlowTemplate } from "../flow-template";
import { prompt } from "../../../entry/flow-login_recovery.generated";

const email = { kind: "email", label: "Email address" } as const;
const password = { kind: "password", label: "Password" } as const;
const code = { kind: "code", label: "Verification code" } as const;
const classSample = {
  names: { member: "Ren" },
  record: {
    account_email: "ren@example.test",
    member_area: "Class schedule",
    next_up: "Tuesday pottery",
  },
};

export const loginRecovery: FlowTemplate = {
  ...prompt,
  id: "login_recovery",
  title: "Log in and recover access",
  nameSlots: ["member"],
  recordShape: { account_email: "string", member_area: "string", next_up: "string" },
  journeys: [
    {
      role: "member",
      id: "return_to_account",
      name: "Return to your account",
      goal: "{name.member} can log in and return to {record.member_area}, even after forgetting a password.",
      steps: [
        {
          id: "login",
          see: "Try this with {record.account_email} and a made-up password. Nothing is sent.",
          do: "Log in with sample credentials or choose Forgot password?",
          next: "verify",
          choices: [{ label: "Forgot password?", step: "recover" }],
          layout: { components: ["Note", "Field"] },
          tier: "service",
          states: ["empty", "error"],
          preview: {
            title: "Log in",
            action: "Log in",
            choiceButtons: true,
            demoInputs: [email, password],
            messages: { error: "The email or password didn’t match. Try again or reset your password." },
          },
        },
        {
          id: "recover",
          see: "Use the sample address {record.account_email}. No reset email will be sent.",
          do: "Request a reset code for the sample address",
          layout: { components: ["Note", "Field"] },
          tier: "service",
          states: ["empty", "error"],
          preview: {
            title: "Reset your password",
            action: "Request reset code",
            demoInputs: [email],
            messages: { error: "The request couldn’t be made. Check the address and try again." },
          },
        },
        {
          id: "recovery_verify",
          see: "If an account matches, a real service would send a code. Use any made-up code here.",
          do: "Verify the sample reset code before opening the new password form",
          layout: { components: ["Note", "Field"] },
          tier: "service",
          states: ["waiting", "error"],
          preview: {
            title: "Check for a reset code",
            action: "Verify reset code",
            demoInputs: [{ ...code, label: "Reset code" }],
            messages: {
              waiting: "A real service would send a code if the address matches an account.",
              error: "That code didn’t work or has expired. Request a new code and try again.",
            },
          },
        },
        {
          id: "reset",
          see: "Enter a made-up new password. This sample won’t change or save a password.",
          do: "Simulate a password reset, then return to log in",
          layout: { components: ["Note", "Field"] },
          tier: "service",
          states: ["empty", "error"],
          preview: {
            title: "Choose a new password",
            action: "Reset password",
            demoInputs: [{ ...password, label: "New password" }],
            messages: { error: "The password wasn’t changed. Try a different sample password." },
          },
        },
        {
          id: "login_after_reset",
          see: "Sample reset complete. Log in again as {record.account_email} to continue.",
          do: "Log in again after the sample reset",
          layout: { components: ["Note", "Field"] },
          tier: "service",
          states: ["success", "error"],
          preview: {
            title: "Log in again",
            action: "Log in",
            demoInputs: [email, password],
            messages: { error: "The email or password didn’t match. Check both and try again." },
          },
        },
        {
          id: "verify",
          see: "A real service would email a code to {record.account_email}. Use any made-up code here.",
          do: "Verify the sample login code and open the member area",
          layout: { components: ["Note", "Field"] },
          tier: "service",
          states: ["waiting", "error"],
          preview: {
            title: "Verify your login",
            action: "Verify and log in",
            demoInputs: [code],
            messages: {
              waiting: "Waiting for the sample verification code. No email was sent.",
              error: "That code didn’t work or has expired. Request a new code and try again.",
            },
          },
        },
        {
          id: "signed_in",
          see: "Welcome back, {name.member}. You’re viewing the sample member area.",
          next: null,
          layout: { components: ["Note", "KeyValue"] },
          tier: "service",
          states: ["success"],
          preview: { title: "{record.member_area}", fields: ["next_up"] },
        },
      ],
    },
  ],
  examples: [
    { id: "classes", ...classSample },
    {
      id: "volunteering",
      names: { member: "Mika" },
      record: {
        account_email: "mika@example.test",
        member_area: "Volunteer shifts",
        next_up: "Saturday food pantry",
      },
    },
  ],
  probes: {
    pick: [
      {
        request: "Let returning members log in, and help them get back in if they forgot their password.",
        expect: "login_recovery",
      },
      {
        request: "Let brand-new members create an account, verify their email and book their first class.",
        expect: "signup_onboard",
      },
      {
        request: "Make an offline tip calculator I can use without signing in or creating an account.",
        expect: null,
      },
    ],
    fill: [
      {
        request:
          "For a fictional class app, Ren logs in as ren@example.test and returns to 'Class schedule', where 'Tuesday pottery' is next up. Show verification and how Ren resets a forgotten password.",
        expect: classSample,
      },
    ],
  },
};
