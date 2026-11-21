export const connectionPacks = [
  {
    id: "comms",
    name: "Comms",
    purpose:
      "Direct and workplace communication across chat and email threads, server channels, contacts, and voice or video calls.",
    pick: "Multi-thread inboxes, channel navigation, call lobbies, voicemail and T9 dialing. Not one simple conversation (core), public feeds (social), club governance (community), or service tickets (requests).",
  },
  {
    id: "assistant",
    name: "Assistant",
    purpose:
      "Conversations with an AI: streaming answers and code, cited sources, tool traces, generated artifacts, starter prompts and voice mode.",
    pick: "Use assistant alone for an AI chat that accepts notes and generates guides or other artifacts. Add workspace only for independent file sharing or editing, and media only for a separately managed reading library. Not human chat (comms) or graded quizzes (learning).",
  },
  {
    id: "workspace",
    name: "Workspace",
    purpose:
      "Shared cloud files and folders, quick notes, versioned team wikis and document review with link and role permissions.",
    pick: "Use when people organize or collaborate on cloud documents or structured wiki pages. Not local files (utilities), personal life-admin records (paperwork), or published books (media).",
  },
  {
    id: "utilities",
    name: "Utilities",
    purpose:
      "Everyday device tools: scientific calculators, unit converters, language translation, QR studios, network speed testing and device file management.",
    pick: "Pick even for one dedicated tool: generate or scan QR codes, or browse device folders, inspect storage and move files into a locked local folder. Not account protection (security), trip-only currency references (trips), an AI workspace (assistant), or shared cloud folders (workspace).",
  },
  {
    id: "security",
    name: "Security",
    purpose:
      "Account and connection protection: rotating 2FA codes, MFA approvals, password and passkey vaults, password generators, recovery codes, VPN controls and credential audits.",
    pick: "Pick for securing sign-ins or connections. Not filing life-admin documents (paperwork) or checking connection speed (utilities).",
  },
  {
    id: "auto",
    name: "Auto",
    purpose:
      "Cars and EVs: a vehicle garage, remote controls, mileage-based maintenance, OBD diagnostics, charging and fill-ups, parking meters, and used-car listings with VIN reports.",
    pick: "Pick for operating, maintaining, charging, parking or shopping for vehicles. A used-car shortlist with VIN reports is auto alone, not an owned-asset catalog (inventory). Not turn-by-turn guidance (navigation), home automation (home), or a map of venues or stations (places).",
  },
  {
    id: "medical",
    name: "Medical",
    purpose:
      "Patient portal, pharmacy and clinical workflows: lab reference ranges, prescription refills and prices, telehealth, insurance coverage, care records and connected therapy summaries. No automated diagnosis.",
    pick: "Pick for provider-facing or patient-facing clinical records or care workflows. Not personal exercise, symptom or pill tracking (health), or nonclinical client billing (customers).",
  },
  {
    id: "weather",
    name: "Weather",
    purpose:
      "Dedicated forecasts and conditions: hourly curves, daily temperature ranges, air quality, UV, pollen, severe alerts, sun and moon arcs, saved cities and radar snapshots.",
    pick: "Only choose for actual weather, air-quality or astronomical conditions, not a daily schedule or a statistics chart. Not weather as one detail of a trip itinerary (trips), or venue discovery (places).",
  },
  {
    id: "realestate",
    name: "Real Estate",
    purpose:
      "Home buying and apartment hunting: price-pin maps, property listings, comparison and saved alerts, mortgage affordability and arranging tours.",
    pick: "Use for a buyer or renter searching for a home. Not operating occupied rental units (property), storing one signed lease (inventory), or everyday budgeting (money).",
  },
  {
    id: "parenting",
    name: "Parenting",
    purpose:
      "Parent-facing pregnancy, pediatric growth, co-parenting and child wellbeing: gestational milestones, growth percentiles, custody swaps, child expenses, screen limits and private family albums.",
    pick: "Use for pregnancy, growth, custody or child-specific caregiver workflows. A parent gate for settings in a child-facing app belongs to kids, not parenting. Not household chores, general family routines or a simple baby log (home), or clinical records (medical).",
  },
] as const;
