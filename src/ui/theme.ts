export const palettes = {
  dark: {
    bg: `#0B0F14`,
    red: `#EF6767`,
    blue: `#4788FF`,
    card: `#121922`,
    rail: `#0E141C`,
    text: `#EDF2F7`,
    faint: `#627187`,
    green: `#27C888`,
    input: `#0F1721`,
    muted: `#93A1B5`,
    border: `#263140`,
    raised: `#18222F`,
    selected: `#182F51`,
  },
  light: {
    bg: `#F3F6FA`,
    red: `#CC3636`,
    blue: `#2563EB`,
    card: `#FFFFFF`,
    rail: `#FFFFFF`,
    text: `#111C2D`,
    faint: `#74839A`,
    green: `#128654`,
    input: `#F8FAFC`,
    muted: `#526178`,
    border: `#DAE2EC`,
    raised: `#EDF2F8`,
    selected: `#E8F0FF`,
  },
};

export type Palette = typeof palettes.dark;
