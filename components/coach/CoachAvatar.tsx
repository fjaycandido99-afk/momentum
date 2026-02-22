'use client'

import { useId, useState } from 'react'
import type { MindsetId } from '@/lib/mindset/types'

export type CoachEmotion = 'idle' | 'listening' | 'thinking' | 'happy' | 'empathetic' | 'excited'

interface CoachAvatarProps {
  mindsetId?: MindsetId | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** When true, avatar plays attention-grabbing bounce + glow animation (used during nudges on home) */
  nudging?: boolean
  /** Emotional state — used during coach chat for reactive animations */
  emotion?: CoachEmotion
}

const SIZE_CLASS = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-16 h-16' }

// ── Astro Bot palette ─────────────────────────────────────
const BOT = {
  body: '#e8ecf4',
  bodyEdge: '#ced5e3',
  visor: '#0b1020',
  rim: '#7da8d6',
}

// ── Per-mindset theme ─────────────────────────────────────
interface MindsetTheme {
  accent: string
  bg: [string, string]
  border: string
}

const THEMES: Record<MindsetId, MindsetTheme> = {
  stoic:          { accent: '#d4b070', bg: ['#2a2010', '#080600'], border: 'white' },
  existentialist: { accent: '#8a9aba', bg: ['#181e2c', '#060810'], border: 'white' },
  cynic:          { accent: '#e86838', bg: ['#2a1408', '#080400'], border: 'white' },
  hedonist:       { accent: '#80d090', bg: ['#102810', '#040a02'], border: 'white' },
  samurai:        { accent: '#d86058', bg: ['#2a1010', '#080404'], border: 'white' },
  scholar:        { accent: '#b088e0', bg: ['#1e102c', '#080410'], border: 'white' },
  manifestor:     { accent: '#e8b848', bg: ['#2a2008', '#080600'], border: 'white' },
  hustler:        { accent: '#8a9aaa', bg: ['#1c2028', '#060810'], border: 'white' },
}

// ── Emotion animation configs ────────────────────────────

interface EmotionConfig {
  headValues: string
  headDur: string
  breathValues: string
  breathDur: string
  eyeOffsetX: number
  eyeOffsetY: number
  eyeColor: 'default' | 'accent'
  eyeGlowValues: string
  eyeGlowDur: string
  blinkDur: string
  antennaDur: string
  antennaValues: string
}

const EMOTION_CONFIGS: Record<CoachEmotion, EmotionConfig> = {
  idle: {
    headValues: '0 50 50;2 50 50;0 50 50;-2 50 50;0 50 50',
    headDur: '6s',
    breathValues: '0 0;0 -1;0 0',
    breathDur: '4s',
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    eyeColor: 'default',
    eyeGlowValues: '0.8;1;0.8',
    eyeGlowDur: '3s',
    blinkDur: '4s',
    antennaDur: '2s',
    antennaValues: '0.6;1;0.6',
  },
  listening: {
    headValues: '0 50 50;8 50 50;10 50 50;8 50 50;0 50 50',
    headDur: '3s',
    breathValues: '0 0;0 -1;0 0',
    breathDur: '5s',
    eyeOffsetX: -5,
    eyeOffsetY: 0,
    eyeColor: 'default',
    eyeGlowValues: '0.85;1;0.85',
    eyeGlowDur: '1.5s',
    blinkDur: '8s',
    antennaDur: '2s',
    antennaValues: '0.7;1;0.7',
  },
  thinking: {
    headValues: '0 50 50;12 50 50;10 50 50;12 50 50;0 50 50',
    headDur: '4s',
    breathValues: '0 0;0 -2;0 2;0 0',
    breathDur: '3s',
    eyeOffsetX: 5,
    eyeOffsetY: -5,
    eyeColor: 'default',
    eyeGlowValues: '0.5;1;0.5',
    eyeGlowDur: '2s',
    blinkDur: '8s',
    antennaDur: '0.8s',
    antennaValues: '0.4;1;0.4',
  },
  happy: {
    headValues: '0 50 50;8 50 50;0 50 50;-8 50 50;0 50 50',
    headDur: '1.2s',
    breathValues: '0 0;0 -4;0 0',
    breathDur: '1.5s',
    eyeOffsetX: 0,
    eyeOffsetY: -2,
    eyeColor: 'default',
    eyeGlowValues: '0.6;1;0.6',
    eyeGlowDur: '0.8s',
    blinkDur: '2s',
    antennaDur: '0.6s',
    antennaValues: '0.5;1;0.5',
  },
  empathetic: {
    headValues: '0 50 50;-10 50 50;-8 50 50;-10 50 50;0 50 50',
    headDur: '4s',
    breathValues: '0 0;0 -2;0 0',
    breathDur: '5s',
    eyeOffsetX: -2,
    eyeOffsetY: 4,
    eyeColor: 'default',
    eyeGlowValues: '0.4;0.7;0.4',
    eyeGlowDur: '3s',
    blinkDur: '5s',
    antennaDur: '3s',
    antennaValues: '0.3;0.6;0.3',
  },
  excited: {
    headValues: '0 50 50;10 50 50;0 50 50;-10 50 50;0 50 50',
    headDur: '0.8s',
    breathValues: '0 0;0 -6;0 2;0 -4;0 0',
    breathDur: '1s',
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    eyeColor: 'accent',
    eyeGlowValues: '0.5;1;0.5',
    eyeGlowDur: '0.5s',
    blinkDur: '1.5s',
    antennaDur: '0.4s',
    antennaValues: '0.3;1;0.3',
  },
}

// ── Animation helpers ─────────────────────────────────────

function AnimatedHead({ children, emotion }: { children: React.ReactNode; emotion?: CoachEmotion }) {
  const cfg = emotion ? EMOTION_CONFIGS[emotion] : EMOTION_CONFIGS.idle
  return (
    <g key={`head-${emotion || 'idle'}`}>
      <animateTransform attributeName="transform" type="rotate"
        values={cfg.headValues}
        dur={cfg.headDur} repeatCount="indefinite" />
      {children}
    </g>
  )
}

function BlinkingEye({ cx, cy, children, dur }: { cx: number; cy: number; children: React.ReactNode; dur?: string }) {
  const d = dur || '4s'
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <g key={`blink-${d}`}>
        <animateTransform attributeName="transform" type="scale"
          values="1 1;1 1;1 0.1;1 1"
          keyTimes="0;0.92;0.96;1"
          dur={d} repeatCount="indefinite" />
        <g transform={`translate(${-cx}, ${-cy})`}>
          {children}
        </g>
      </g>
    </g>
  )
}

function BreathingBody({ children, nudging, emotion }: { children: React.ReactNode; nudging?: boolean; emotion?: CoachEmotion }) {
  // Nudging takes priority (home-page specific), then emotion, then default
  const cfg = emotion ? EMOTION_CONFIGS[emotion] : EMOTION_CONFIGS.idle
  const breathKey = nudging ? 'nudge' : (emotion || 'idle')
  return (
    <g key={`breath-${breathKey}`}>
      <animateTransform attributeName="transform" type="translate"
        values={nudging ? '0 0;0 -4;0 1;0 -2;0 0' : cfg.breathValues}
        dur={nudging ? '1.2s' : cfg.breathDur} repeatCount="indefinite" />
      {children}
    </g>
  )
}

// ── Bot Mouth (emotion-reactive) ────────────────────────

function BotMouth({ emotion, nudging, eyeFill }: { emotion?: CoachEmotion; nudging?: boolean; eyeFill: string }) {
  const e = emotion || 'idle'

  // Nudging — excited little open mouth
  if (nudging) {
    return (
      <ellipse cx="50" cy="76" rx="5" ry="3.5" fill={eyeFill} opacity="0.8" />
    )
  }

  return (
    <g key={`mouth-${e}`}>
      {e === 'idle' && (
        /* Neutral — gentle smile */
        <path d="M42 74 Q50 78 58 74" stroke={eyeFill} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      )}
      {e === 'listening' && (
        /* Attentive — open "o" */
        <ellipse cx="50" cy="76" rx="4.5" ry="3.5" fill={eyeFill} opacity="0.7" />
      )}
      {e === 'thinking' && (
        /* Pursed/hmm — wavy squiggle */
        <path d="M42 75 Q46 78 50 75 Q54 72 58 75" stroke={eyeFill} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      )}
      {e === 'happy' && (
        /* Wide smile — big grin */
        <>
          <path d="M36 72 Q43 82 50 82 Q57 82 64 72" stroke={eyeFill} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85" />
          <path d="M38 73 Q50 84 62 73" fill={eyeFill} opacity="0.3" />
        </>
      )}
      {e === 'empathetic' && (
        /* Sympathetic frown */
        <path d="M40 78 Q50 73 60 78" stroke={eyeFill} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      )}
      {e === 'excited' && (
        /* Big open grin */
        <>
          <ellipse cx="50" cy="76" rx="10" ry="6" fill={eyeFill} opacity="0.4" />
          <path d="M34 72 Q42 84 50 84 Q58 84 66 72" stroke={eyeFill} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
          <path d="M36 73 Q50 87 64 73" fill={eyeFill} opacity="0.3" />
        </>
      )}
    </g>
  )
}

// ── Bot Face (Astro Bot style — round, clean, big eyes) ───

function BotFace({ accent, nudging, emotion }: { accent: string; nudging?: boolean; emotion?: CoachEmotion }) {
  const cfg = emotion ? EMOTION_CONFIGS[emotion] : EMOTION_CONFIGS.idle
  const eyeFill = nudging ? accent : cfg.eyeColor === 'accent' ? accent : '#4A9EFF'
  const eyeGlowVals = nudging ? '0.7;1;0.7' : cfg.eyeGlowValues
  const eyeGlowDur = nudging ? '0.8s' : cfg.eyeGlowDur
  const blinkDur = nudging ? '1s' : cfg.blinkDur
  const antR = nudging ? 4 : (emotion === 'excited' ? 4 : 3)

  return (
    <>
      {/* Round head */}
      <rect x="10" y="12" width="80" height="76" rx="36" fill={BOT.body} />
      <rect x="10" y="12" width="80" height="76" rx="36" fill="none" stroke={BOT.rim} strokeWidth="1" opacity="0.2" />
      <ellipse cx="38" cy="28" rx="18" ry="7" fill="white" opacity="0.45" />

      {/* Antenna */}
      <line x1="50" y1="12" x2="50" y2="4" stroke={BOT.bodyEdge} strokeWidth="2.5" strokeLinecap="round" />
      <circle key={`ant-${emotion || 'idle'}`} cx="50" cy="4" r={antR} fill={accent} opacity="0.8">
        <animate attributeName="opacity" values={nudging ? '0.5;1;0.5' : cfg.antennaValues} dur={nudging ? '0.6s' : cfg.antennaDur} repeatCount="indefinite" />
        {(nudging || emotion === 'excited') && <animate attributeName="r" values="3;5;3" dur={nudging ? '0.6s' : '0.8s'} repeatCount="indefinite" />}
      </circle>

      {/* Large visor — extended down for mouth space */}
      <rect x="18" y="36" width="64" height="44" rx="14" fill={BOT.visor} />

      {/* Eye gaze wrapper — shifts both eyes together */}
      <g key={`gaze-${emotion || 'idle'}`} transform={`translate(${cfg.eyeOffsetX}, ${cfg.eyeOffsetY})`}>
        {/* Left eye — round glowing */}
        <BlinkingEye cx={36} cy={53} dur={blinkDur}>
          <circle cx="36" cy="53" r="10" fill={eyeFill} opacity="0.9">
            <animate attributeName="opacity" values={eyeGlowVals} dur={eyeGlowDur} repeatCount="indefinite" />
          </circle>
          <circle cx="33" cy="49" r="3" fill="white" opacity="0.45" />
        </BlinkingEye>

        {/* Right eye — round glowing */}
        <BlinkingEye cx={64} cy={53} dur={blinkDur}>
          <circle cx="64" cy="53" r="10" fill={eyeFill} opacity="0.9">
            <animate attributeName="opacity" values={eyeGlowVals} dur={eyeGlowDur} repeatCount="indefinite" />
          </circle>
          <circle cx="61" cy="49" r="3" fill="white" opacity="0.45" />
        </BlinkingEye>
      </g>

    </>
  )
}

// ── Outfit Layout (scales bot down to ~68%) ───────────────

interface OutfitSlots {
  behindHead?: React.ReactNode
  onHead?: React.ReactNode
  ambient?: React.ReactNode
  accent: string
  nudging?: boolean
  emotion?: CoachEmotion
}

function OutfitLayout({ behindHead, onHead, ambient, accent, nudging, emotion }: OutfitSlots) {
  return (
    <>
      <g transform="translate(50 50) scale(0.68) translate(-50 -50)">
        <BreathingBody nudging={nudging} emotion={emotion}>
          {behindHead}
          <AnimatedHead emotion={emotion}>
            <BotFace accent={accent} nudging={nudging} emotion={emotion} />
            {onHead}
            {/* Mouth rendered AFTER outfit accessories so it's always visible */}
            <BotMouth emotion={emotion} nudging={nudging} eyeFill={nudging ? accent : (emotion && EMOTION_CONFIGS[emotion].eyeColor === 'accent' ? accent : '#4A9EFF')} />
          </AnimatedHead>
        </BreathingBody>
      </g>
      {/* Subtle ambient particles */}
      <circle cx="22" cy="20" r={nudging ? 1.5 : 1} fill={accent} opacity="0.3">
        <animate attributeName="cy" values="20;10;20" dur={nudging ? '1.8s' : '4s'} repeatCount="indefinite" />
        <animate attributeName="opacity" values={nudging ? '0.4;0.1;0.4' : '0.3;0;0.3'} dur={nudging ? '1.8s' : '4s'} repeatCount="indefinite" />
      </circle>
      <circle cx="78" cy="18" r={nudging ? 1.2 : 0.8} fill={accent} opacity="0.25">
        <animate attributeName="cy" values="18;8;18" dur={nudging ? '1.4s' : '3.4s'} repeatCount="indefinite" />
        <animate attributeName="opacity" values={nudging ? '0.35;0.05;0.35' : '0.25;0;0.25'} dur={nudging ? '1.4s' : '3.4s'} repeatCount="indefinite" />
      </circle>
      {/* Extra particles when nudging */}
      {nudging && (
        <>
          <circle cx="14" cy="40" r="1.2" fill={accent} opacity="0">
            <animate attributeName="opacity" values="0;0.5;0" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="cy" values="40;28;40" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="86" cy="36" r="1" fill={accent} opacity="0">
            <animate attributeName="opacity" values="0;0.4;0" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="cy" values="36;24;36" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="50" cy="12" r="1.3" fill={accent} opacity="0">
            <animate attributeName="opacity" values="0;0.45;0" dur="1s" repeatCount="indefinite" />
            <animate attributeName="cy" values="12;2;12" dur="1s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {ambient}
    </>
  )
}

// ── 1. Sage (Stoic) — Detailed beard + laurels ───────────

function SageOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return (
    <OutfitLayout
      accent={theme.accent}
      nudging={nudging}
      emotion={emotion}
      onHead={
        <>
          {/* Sideburns */}
          <path d="M18 56 L14 68 Q16 72 20 68 L22 58 Z" fill="black" />
          <path d="M82 56 L86 68 Q84 72 80 68 L78 58 Z" fill="black" />
          {/* Full mustache — thick handlebar */}
          <path d="M32 64 Q36 60 42 62 Q46 58 50 62 Q54 58 58 62 Q64 60 68 64 Q72 66 74 64 L74 68 Q68 72 64 68 Q58 66 50 68 Q42 66 36 68 Q32 72 26 68 L26 64 Q28 66 32 64 Z" fill="black" />
          {/* Main beard body */}
          <path d="M26 68 Q28 66 36 68 Q42 66 50 70 Q58 66 64 68 Q72 66 74 68 L76 74 Q72 86 50 94 Q28 86 24 74 Z" fill="black" />
          {/* Beard texture lines */}
          <path d="M36 74 Q42 70 50 76" stroke={BOT.body} strokeWidth="0.6" opacity="0.2" fill="none" />
          <path d="M50 76 Q58 70 64 74" stroke={BOT.body} strokeWidth="0.6" opacity="0.2" fill="none" />
          <path d="M34 80 Q42 76 50 82 Q58 76 66 80" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" fill="none" />
          {/* Wisdom dot on forehead with ring */}
          <circle cx="50" cy="24" r="4" fill="black" />
          <circle cx="50" cy="24" r="2" fill={BOT.body} opacity="0.25" />
          {/* Laurel leaves at temples */}
          <path d="M20 30 Q16 26 18 22 Q22 24 20 30 Z" fill="black" />
          <path d="M18 34 Q14 30 16 26 Q20 28 18 34 Z" fill="black" />
          <path d="M80 30 Q84 26 82 22 Q78 24 80 30 Z" fill="black" />
          <path d="M82 34 Q86 30 84 26 Q80 28 82 34 Z" fill="black" />
        </>
      }
    />
  )
}

// ── 2. Guide (Existentialist) — Detailed glasses + beret ──

function GuideOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return (
    <OutfitLayout
      accent={theme.accent}
      nudging={nudging}
      emotion={emotion}
      onHead={
        <>
          {/* Beret on top */}
          <path d="M22 20 Q24 8 50 6 Q76 8 78 20 Q74 16 50 14 Q26 16 22 20 Z" fill="black" />
          <ellipse cx="50" cy="14" rx="28" ry="10" fill="black" />
          <circle cx="50" cy="6" r="2.5" fill="black" />
          {/* Beret texture */}
          <path d="M30 14 Q40 10 50 14" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" fill="none" />
          <path d="M50 14 Q60 10 70 14" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" fill="none" />
          {/* Left lens — fully solid */}
          <circle cx="36" cy="53" r="15" fill="black" />
          {/* Right lens — fully solid */}
          <circle cx="64" cy="53" r="15" fill="black" />
          {/* Lens shine marks */}
          <path d="M28 46 L32 44" stroke={BOT.body} strokeWidth="1" opacity="0.2" strokeLinecap="round" />
          <path d="M56 46 L60 44" stroke={BOT.body} strokeWidth="1" opacity="0.2" strokeLinecap="round" />
          {/* Bridge — keyhole style */}
          <path d="M49 48 Q50 44 51 48 L53 56 L47 56 Z" fill="black" />
          {/* Temple arms with hinges */}
          <rect x="4" y="50" width="17" height="4" rx="1.5" fill="black" />
          <rect x="79" y="50" width="17" height="4" rx="1.5" fill="black" />
          <circle cx="20" cy="52" r="1.5" fill="black" />
          <circle cx="80" cy="52" r="1.5" fill="black" />
          <circle cx="20" cy="52" r="0.7" fill={BOT.body} opacity="0.25" />
          <circle cx="80" cy="52" r="0.7" fill={BOT.body} opacity="0.25" />
        </>
      }
    />
  )
}

// ── 3. Challenger (Cynic) — Detailed mohawk + scar + studs ─

function ChallengerOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return (
    <OutfitLayout
      accent={theme.accent}
      nudging={nudging}
      emotion={emotion}
      onHead={
        <>
          {/* Mohawk — tall jagged spikes */}
          <path d="M28 18 L32 16 L36 -4 L40 14 L44 -8 L48 12 L50 -12 L52 12 L56 -8 L60 14 L64 -4 L68 16 L72 18 Q66 16 50 16 Q34 16 28 18 Z" fill="black" />
          {/* Mohawk base band */}
          <rect x="28" y="14" width="44" height="6" rx="3" fill="black" />
          {/* Hair texture lines */}
          <path d="M44 14 L44 -6" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M50 14 L50 -10" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M56 14 L56 -6" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          {/* Scar — detailed slash with stitch marks */}
          <path d="M62 24 L66 24 L74 60 L70 60 Z" fill="black" />
          <path d="M60 30 L70 28" stroke={BOT.body} strokeWidth="0.6" opacity="0.2" />
          <path d="M62 38 L72 36" stroke={BOT.body} strokeWidth="0.6" opacity="0.2" />
          <path d="M64 46 L74 44" stroke={BOT.body} strokeWidth="0.6" opacity="0.2" />
          {/* Eyebrow piercing — left */}
          <circle cx="24" cy="36" r="2" fill="black" />
          <circle cx="24" cy="36" r="0.8" fill={BOT.body} opacity="0.3" />
          {/* Chin stud */}
          <circle cx="50" cy="76" r="2" fill="black" />
          <circle cx="50" cy="76" r="0.8" fill={BOT.body} opacity="0.25" />
        </>
      }
    />
  )
}

// ── 4. Muse (Hedonist) — Detailed flower crown + leaves ───

function MuseOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return (
    <OutfitLayout
      accent={theme.accent}
      nudging={nudging}
      emotion={emotion}
      onHead={
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0 0;0 -0.5;0 0" dur="3s" repeatCount="indefinite" />
          {/* Vine base */}
          <path d="M18 22 Q30 12 42 14 Q46 10 50 12 Q54 10 58 14 Q70 12 82 22" fill="black" stroke="black" strokeWidth="2" />
          {/* Leaves between flowers */}
          <path d="M30 18 Q28 14 32 12 Q34 16 30 18 Z" fill="black" />
          <path d="M42 14 Q40 10 44 8 Q46 12 42 14 Z" fill="black" />
          <path d="M58 14 Q56 10 60 8 Q62 12 58 14 Z" fill="black" />
          <path d="M70 18 Q68 14 72 12 Q74 16 70 18 Z" fill="black" />
          {/* Flower 1 — with petals */}
          <circle cx="22" cy="20" r="3" fill="black" />
          <ellipse cx="18" cy="18" rx="3" ry="1.8" fill="black" transform="rotate(-30 18 18)" />
          <ellipse cx="26" cy="18" rx="3" ry="1.8" fill="black" transform="rotate(30 26 18)" />
          <ellipse cx="22" cy="16" rx="1.8" ry="3" fill="black" />
          <circle cx="22" cy="20" r="1.5" fill={BOT.body} opacity="0.25" />
          {/* Flower 2 — rose shape */}
          <circle cx="36" cy="14" r="4" fill="black" />
          <path d="M33 12 Q36 10 39 12 Q37 14 33 12 Z" fill={BOT.body} opacity="0.12" />
          <circle cx="36" cy="14" r="1.5" fill={BOT.body} opacity="0.2" />
          {/* Flower 3 — center bloom */}
          <circle cx="50" cy="10" r="5" fill="black" />
          <ellipse cx="46" cy="8" rx="3" ry="2" fill="black" transform="rotate(-20 46 8)" />
          <ellipse cx="54" cy="8" rx="3" ry="2" fill="black" transform="rotate(20 54 8)" />
          <ellipse cx="50" cy="6" rx="2" ry="3" fill="black" />
          <circle cx="50" cy="10" r="2" fill={BOT.body} opacity="0.2" />
          {/* Flower 4 — rose shape */}
          <circle cx="64" cy="14" r="4" fill="black" />
          <path d="M61 12 Q64 10 67 12 Q65 14 61 12 Z" fill={BOT.body} opacity="0.12" />
          <circle cx="64" cy="14" r="1.5" fill={BOT.body} opacity="0.2" />
          {/* Flower 5 — with petals */}
          <circle cx="78" cy="20" r="3" fill="black" />
          <ellipse cx="74" cy="18" rx="3" ry="1.8" fill="black" transform="rotate(-30 74 18)" />
          <ellipse cx="82" cy="18" rx="3" ry="1.8" fill="black" transform="rotate(30 82 18)" />
          <ellipse cx="78" cy="16" rx="1.8" ry="3" fill="black" />
          <circle cx="78" cy="20" r="1.5" fill={BOT.body} opacity="0.25" />
          {/* Small buds */}
          <circle cx="16" cy="26" r="1.5" fill="black" />
          <circle cx="84" cy="26" r="1.5" fill="black" />
        </g>
      }
    />
  )
}

// ── 5. Sensei (Samurai) — Detailed kabuto helmet ──────────

function SenseiOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return (
    <OutfitLayout
      accent={theme.accent}
      nudging={nudging}
      emotion={emotion}
      onHead={
        <>
          {/* Helmet dome — fully solid */}
          <path d="M6 33 Q12 6 50 -2 Q88 6 94 33 Z" fill="black" />
          {/* Ridge plates on dome */}
          <path d="M50 -2 L50 33" stroke={BOT.body} strokeWidth="0.6" opacity="0.15" />
          <path d="M30 10 L24 33" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M70 10 L76 33" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M40 4 L36 33" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          <path d="M60 4 L64 33" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          {/* Maedate crest — ornamental V with ball */}
          <path d="M38 4 L50 -14 L62 4 L58 2 L50 -8 L42 2 Z" fill="black" />
          <circle cx="50" cy="-14" r="3" fill="black" />
          <circle cx="50" cy="-14" r="1.2" fill={BOT.body} opacity="0.2" />
          {/* Brow guard — decorative band */}
          <rect x="4" y="30" width="92" height="6" rx="2" fill="black" />
          <path d="M10 33 L90 33" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
          {/* Center mon crest on brow */}
          <circle cx="50" cy="33" r="4" fill="black" />
          <path d="M48 31 L50 29 L52 31 L50 35 Z" fill={BOT.body} opacity="0.2" />
          {/* Rivets on brow guard */}
          <circle cx="20" cy="33" r="1.2" fill="black" />
          <circle cx="20" cy="33" r="0.5" fill={BOT.body} opacity="0.2" />
          <circle cx="80" cy="33" r="1.2" fill="black" />
          <circle cx="80" cy="33" r="0.5" fill={BOT.body} opacity="0.2" />
          {/* Shikoro — layered neck guard flaps */}
          <path d="M4 36 L-2 48 L14 48 L18 36 Z" fill="black" />
          <path d="M0 42 L-4 52 L10 52 L14 42 Z" fill="black" />
          <path d="M82 36 L86 48 L102 48 L96 36 Z" fill="black" />
          <path d="M86 42 L90 52 L104 52 L100 42 Z" fill="black" />
          {/* Shikoro plate lines */}
          <path d="M2 45 L12 45" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
          <path d="M88 45 L98 45" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
        </>
      }
    />
  )
}

// ── 6. Oracle (Scholar) — Detailed pointed hood + runes ───

function OracleOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return (
    <OutfitLayout
      accent={theme.accent}
      nudging={nudging}
      emotion={emotion}
      onHead={
        <>
          {/* Hood — fully solid with pointed top */}
          <path d="M8 50 Q4 16 50 -4 Q96 16 92 50 Z" fill="black" />
          {/* Hood side drapes extending down */}
          <path d="M8 50 Q6 60 4 70 L14 68 Q14 58 16 50 Z" fill="black" />
          <path d="M92 50 Q94 60 96 70 L86 68 Q86 58 84 50 Z" fill="black" />
          {/* Hood fabric fold lines */}
          <path d="M30 10 Q40 20 38 40" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" fill="none" />
          <path d="M70 10 Q60 20 62 40" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" fill="none" />
          <path d="M50 -4 Q48 10 46 30" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          {/* Rune marks on hood */}
          <path d="M24 28 L26 24 L28 28 L26 32 Z" fill={BOT.body} opacity="0.12" />
          <path d="M72 28 L74 24 L76 28 L74 32 Z" fill={BOT.body} opacity="0.12" />
          {/* Hood trim edge */}
          <path d="M8 50 Q50 44 92 50" stroke={BOT.body} strokeWidth="0.6" opacity="0.1" fill="none" />
          {/* Ornate clasp at chin — diamond shape */}
          <path d="M46 78 L50 72 L54 78 L50 84 Z" fill="black" />
          <path d="M48 78 L50 74 L52 78 L50 82 Z" fill={BOT.body} opacity="0.15" />
          {/* Side tassels hanging from hood */}
          <path d="M14 68 L12 76 L16 76 L14 68 Z" fill="black" />
          <path d="M86 68 L84 76 L88 76 L86 68 Z" fill="black" />
        </>
      }
      ambient={
        <>
          <circle cx="18" cy="14" r="1.2" fill={theme.accent} opacity="0.35">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="82" cy="18" r="1" fill={theme.accent} opacity="0.3">
            <animate attributeName="opacity" values="0.15;0.45;0.15" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="76" cy="8" r="1.2" fill={theme.accent} opacity="0.3">
            <animate attributeName="opacity" values="0.15;0.5;0.15" dur="3.6s" repeatCount="indefinite" />
          </circle>
          {/* Constellation lines */}
          <line x1="18" y1="14" x2="30" y2="20" stroke={theme.accent} strokeWidth="0.3" opacity="0.1" />
          <line x1="82" y1="18" x2="76" y2="8" stroke={theme.accent} strokeWidth="0.3" opacity="0.1" />
        </>
      }
    />
  )
}

// ── 7. Alchemist (Manifestor) — Ornate crown + crystal ────

function AlchemistOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return (
    <OutfitLayout
      accent={theme.accent}
      nudging={nudging}
      emotion={emotion}
      onHead={
        <>
          {/* Ornate zigzag crown/tiara */}
          <path d="M12 32 L18 18 L26 28 L34 14 L42 26 L50 8 L58 26 L66 14 L74 28 L82 18 L88 32 Z" fill="black" />
          {/* Crown base band */}
          <rect x="10" y="28" width="80" height="5" rx="2" fill="black" />
          {/* Crown point jewel dots */}
          <circle cx="18" cy="18" r="1.5" fill={BOT.body} opacity="0.2" />
          <circle cx="34" cy="14" r="1.5" fill={BOT.body} opacity="0.2" />
          <circle cx="66" cy="14" r="1.5" fill={BOT.body} opacity="0.2" />
          <circle cx="82" cy="18" r="1.5" fill={BOT.body} opacity="0.2" />
          {/* Central crystal — large faceted diamond */}
          <path d="M42 28 L50 6 L58 28 L50 38 Z" fill="black" />
          {/* Crystal facet lines */}
          <path d="M46 18 L50 6 L54 18" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" fill="none" />
          <path d="M44 26 L50 14 L56 26" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" fill="none" />
          <path d="M50 6 L50 38" stroke={BOT.body} strokeWidth="0.3" opacity="0.1" />
          {/* Side gems on band */}
          <path d="M18 28 L20 24 L22 28 L20 32 Z" fill="black" />
          <path d="M78 28 L80 24 L82 28 L80 32 Z" fill="black" />
          <circle cx="20" cy="28" r="0.8" fill={BOT.body} opacity="0.15" />
          <circle cx="80" cy="28" r="0.8" fill={BOT.body} opacity="0.15" />
          {/* Band decorative lines */}
          <path d="M24 30 L40 30" stroke={BOT.body} strokeWidth="0.3" opacity="0.1" />
          <path d="M60 30 L76 30" stroke={BOT.body} strokeWidth="0.3" opacity="0.1" />
        </>
      }
      ambient={
        <>
          <circle cx="22" cy="16" r="1" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.4;0" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="78" cy="12" r="0.8" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.3;0" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="50" cy="2" r="0.9" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.35;0" dur="4s" repeatCount="indefinite" />
          </circle>
        </>
      }
    />
  )
}

// ── 8. Commander (Hustler) — Detailed tactical headset ────

function CommanderOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return (
    <OutfitLayout
      accent={theme.accent}
      nudging={nudging}
      emotion={emotion}
      onHead={
        <>
          {/* Headset band — fully solid padded */}
          <path d="M4 52 Q2 16 50 4 Q98 16 96 52 Z" fill="black" />
          {/* Band padding detail */}
          <path d="M20 18 Q50 10 80 18" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" fill="none" />
          <path d="M16 24 Q50 16 84 24" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          {/* Left ear cup — detailed */}
          <rect x="-2" y="42" width="14" height="20" rx="5" fill="black" />
          <rect x="0" y="44" width="10" height="16" rx="4" fill="black" />
          <line x1="2" y1="48" x2="8" y2="48" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="2" y1="52" x2="8" y2="52" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="2" y1="56" x2="8" y2="56" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          {/* Right ear cup — detailed */}
          <rect x="88" y="42" width="14" height="20" rx="5" fill="black" />
          <rect x="90" y="44" width="10" height="16" rx="4" fill="black" />
          <line x1="92" y1="48" x2="98" y2="48" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="92" y1="52" x2="98" y2="52" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="92" y1="56" x2="98" y2="56" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          {/* Mic boom arm — articulated */}
          <path d="M0 62 Q4 68 8 72 L12 76" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" />
          <circle cx="4" cy="65" r="1.5" fill="black" />
          <circle cx="4" cy="65" r="0.6" fill={BOT.body} opacity="0.2" />
          {/* Mic capsule */}
          <rect x="9" y="73" width="8" height="6" rx="3" fill="black" />
          <line x1="11" y1="75" x2="15" y2="75" stroke={BOT.body} strokeWidth="0.4" opacity="0.15" />
          <line x1="11" y1="77" x2="15" y2="77" stroke={BOT.body} strokeWidth="0.4" opacity="0.15" />
          {/* Tactical antenna on right ear */}
          <line x1="96" y1="42" x2="98" y2="30" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <circle cx="98" cy="30" r="1.5" fill="black" />
          <circle cx="98" cy="30" r="0.6" fill={BOT.body} opacity="0.25" />
          {/* Status LED on left ear */}
          <circle cx="1" cy="46" r="1" fill="black" />
          <circle cx="1" cy="46" r="0.5" fill={BOT.body} opacity="0.3" />
        </>
      }
    />
  )
}

// ── Outfit map & export ───────────────────────────────────

const OUTFIT_MAP: Record<string, React.FC<{ theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }>> = {
  stoic: SageOutfit,
  existentialist: GuideOutfit,
  cynic: ChallengerOutfit,
  hedonist: MuseOutfit,
  samurai: SenseiOutfit,
  scholar: OracleOutfit,
  manifestor: AlchemistOutfit,
  hustler: CommanderOutfit,
}

export function CoachAvatar({ mindsetId, size = 'md', className = '', nudging, emotion }: CoachAvatarProps) {
  const reactId = useId()
  const [tapped, setTapped] = useState(false)
  const mid = mindsetId || 'stoic'
  const theme = THEMES[mid] || THEMES.stoic
  const Outfit = OUTFIT_MAP[mid] || SageOutfit
  const bgId = `cbg${reactId}`
  const clipId = `ccl${reactId}`
  const glowId = `cglow${reactId}`
  // Nudging overrides emotion (nudging is home-page specific)
  const effectiveEmotion = nudging ? undefined : emotion

  return (
    <div
      className={`${SIZE_CLASS[size]} rounded-full overflow-visible shrink-0 cursor-pointer transition-transform duration-300 ${tapped ? 'scale-110' : ''} ${nudging ? 'animate-coach-bounce' : ''} ${className}`}
      onClick={() => { setTapped(true); setTimeout(() => setTapped(false), 600) }}
    >
      <svg viewBox="-6 -6 112 112" width="100%" height="100%" aria-hidden="true" className="overflow-visible">
        <defs>
          <radialGradient id={bgId} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor={theme.bg[0]} />
            <stop offset="100%" stopColor={theme.bg[1]} />
          </radialGradient>
          <clipPath id={clipId}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
          {nudging && (
            <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor={theme.accent} stopOpacity="0.25" />
              <stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
            </radialGradient>
          )}
        </defs>
        {/* Pulsing glow ring when nudging */}
        {nudging && (
          <circle cx="50" cy="50" r="55" fill={`url(#${glowId})`}>
            <animate attributeName="r" values="52;58;52" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite" />
          </circle>
        )}
        <g clipPath={`url(#${clipId})`}>
          <circle cx="50" cy="50" r="50" fill={`url(#${bgId})`} />
          <Outfit theme={theme} nudging={nudging} emotion={effectiveEmotion} />
        </g>
        <circle cx="50" cy="50" r="49" fill="none" stroke={nudging ? theme.accent : theme.border} strokeWidth={nudging ? 1.5 : 1} strokeOpacity={nudging ? 0.4 : 0.15} />
      </svg>
    </div>
  )
}
