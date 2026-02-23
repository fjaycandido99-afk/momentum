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
          {/* Sideburns — thicker with wave texture */}
          <path d="M16 54 L12 70 Q14 76 22 70 L24 56 Z" fill="black" />
          <path d="M84 54 L88 70 Q86 76 78 70 L76 56 Z" fill="black" />
          <path d="M18 60 Q16 64 18 68" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" fill="none" />
          <path d="M82 60 Q84 64 82 68" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" fill="none" />
          {/* Full mustache — thick handlebar with curled ends */}
          <path d="M32 64 Q36 60 42 62 Q46 58 50 62 Q54 58 58 62 Q64 60 68 64 Q72 66 74 64 L74 68 Q68 72 64 68 Q58 66 50 68 Q42 66 36 68 Q32 72 26 68 L26 64 Q28 66 32 64 Z" fill="black" />
          {/* Mustache curl accents */}
          <circle cx="24" cy="66" r="2.5" fill="black" />
          <circle cx="76" cy="66" r="2.5" fill="black" />
          {/* Main beard body */}
          <path d="M24 68 Q28 66 36 68 Q42 66 50 70 Q58 66 64 68 Q72 66 76 68 L78 76 Q74 90 50 98 Q26 90 22 76 Z" fill="black" />
          {/* Beard texture lines — more strands */}
          <path d="M32 72 Q40 68 50 74" stroke={BOT.body} strokeWidth="0.7" opacity="0.18" fill="none" />
          <path d="M50 74 Q60 68 68 72" stroke={BOT.body} strokeWidth="0.7" opacity="0.18" fill="none" />
          <path d="M34 78 Q42 74 50 80 Q58 74 66 78" stroke={BOT.body} strokeWidth="0.6" opacity="0.15" fill="none" />
          <path d="M38 84 Q46 80 50 86 Q54 80 62 84" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" fill="none" />
          <path d="M42 90 Q50 86 58 90" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          {/* Wisdom dot on forehead — larger with double ring */}
          <circle cx="50" cy="22" r="5" fill="black" />
          <circle cx="50" cy="22" r="3" fill={BOT.body} opacity="0.15" />
          <circle cx="50" cy="22" r="1.5" fill={BOT.body} opacity="0.3" />
          {/* Laurel wreath — more leaves, fuller */}
          <path d="M20 28 Q16 24 18 20 Q22 22 20 28 Z" fill="black" />
          <path d="M18 32 Q14 28 16 24 Q20 26 18 32 Z" fill="black" />
          <path d="M16 36 Q12 32 14 28 Q18 30 16 36 Z" fill="black" />
          <path d="M80 28 Q84 24 82 20 Q78 22 80 28 Z" fill="black" />
          <path d="M82 32 Q86 28 84 24 Q80 26 82 32 Z" fill="black" />
          <path d="M84 36 Q88 32 86 28 Q82 30 84 36 Z" fill="black" />
          {/* Leaf vein detail */}
          <path d="M18 26 L20 22" stroke={BOT.body} strokeWidth="0.3" opacity="0.15" />
          <path d="M82 26 L80 22" stroke={BOT.body} strokeWidth="0.3" opacity="0.15" />
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
          {/* Beret — fuller with tilt */}
          <path d="M18 22 Q20 6 50 2 Q80 6 82 22 Q76 16 50 14 Q24 16 18 22 Z" fill="black" />
          <ellipse cx="52" cy="12" rx="32" ry="12" fill="black" />
          <circle cx="50" cy="4" r="3" fill="black" />
          {/* Beret seam lines */}
          <path d="M26 14 Q38 8 50 12" stroke={BOT.body} strokeWidth="0.6" opacity="0.15" fill="none" />
          <path d="M50 12 Q62 8 74 14" stroke={BOT.body} strokeWidth="0.6" opacity="0.15" fill="none" />
          <path d="M34 10 Q50 4 66 10" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" fill="none" />
          {/* Left lens — with frame rim */}
          <circle cx="36" cy="53" r="16" fill="black" />
          <circle cx="36" cy="53" r="16" fill="none" stroke={BOT.body} strokeWidth="1" opacity="0.12" />
          {/* Right lens — with frame rim */}
          <circle cx="64" cy="53" r="16" fill="black" />
          <circle cx="64" cy="53" r="16" fill="none" stroke={BOT.body} strokeWidth="1" opacity="0.12" />
          {/* Lens shine — larger arcs */}
          <path d="M26 46 Q30 42 34 44" stroke={BOT.body} strokeWidth="1.2" opacity="0.25" strokeLinecap="round" fill="none" />
          <path d="M54 46 Q58 42 62 44" stroke={BOT.body} strokeWidth="1.2" opacity="0.25" strokeLinecap="round" fill="none" />
          {/* Secondary shine dot */}
          <circle cx="28" cy="48" r="1" fill={BOT.body} opacity="0.15" />
          <circle cx="56" cy="48" r="1" fill={BOT.body} opacity="0.15" />
          {/* Bridge — keyhole style, thicker */}
          <path d="M48 46 Q50 42 52 46 L54 58 L46 58 Z" fill="black" />
          <path d="M49 48 L51 48" stroke={BOT.body} strokeWidth="0.4" opacity="0.15" />
          {/* Temple arms — thicker with sculpted hinges */}
          <rect x="2" y="49" width="18" height="5" rx="2" fill="black" />
          <rect x="80" y="49" width="18" height="5" rx="2" fill="black" />
          {/* Hinge screws */}
          <circle cx="19" cy="52" r="2" fill="black" />
          <circle cx="81" cy="52" r="2" fill="black" />
          <circle cx="19" cy="52" r="0.8" fill={BOT.body} opacity="0.3" />
          <circle cx="81" cy="52" r="0.8" fill={BOT.body} opacity="0.3" />
          {/* Temple arm bend detail */}
          <path d="M4 52 L4 54" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M96 52 L96 54" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
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
          {/* Mohawk — taller, more spikes */}
          <path d="M26 18 L30 16 L34 -6 L38 14 L42 -10 L46 12 L48 -14 L50 -16 L52 -14 L54 12 L58 -10 L62 14 L66 -6 L70 16 L74 18 Q66 16 50 16 Q34 16 26 18 Z" fill="black" />
          {/* Mohawk base band — wider */}
          <rect x="24" y="14" width="52" height="7" rx="3" fill="black" />
          {/* Hair strand texture — more lines */}
          <path d="M38 14 L38 -8" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M42 14 L42 -8" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          <path d="M46 14 L47 -12" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M50 14 L50 -14" stroke={BOT.body} strokeWidth="0.6" opacity="0.14" />
          <path d="M54 14 L53 -12" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M58 14 L58 -8" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          <path d="M62 14 L62 -4" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          {/* Scar — wider slash with more stitches */}
          <path d="M60 22 L66 22 L76 62 L70 62 Z" fill="black" />
          <path d="M59 28 L68 26" stroke={BOT.body} strokeWidth="0.7" opacity="0.22" />
          <path d="M60 34 L70 32" stroke={BOT.body} strokeWidth="0.7" opacity="0.22" />
          <path d="M62 40 L72 38" stroke={BOT.body} strokeWidth="0.7" opacity="0.22" />
          <path d="M63 46 L73 44" stroke={BOT.body} strokeWidth="0.7" opacity="0.22" />
          <path d="M64 52 L74 50" stroke={BOT.body} strokeWidth="0.6" opacity="0.18" />
          {/* Eyebrow piercing — left, with barbell */}
          <circle cx="22" cy="36" r="2.5" fill="black" />
          <circle cx="22" cy="36" r="1" fill={BOT.body} opacity="0.3" />
          <circle cx="26" cy="34" r="1.5" fill="black" />
          <circle cx="26" cy="34" r="0.6" fill={BOT.body} opacity="0.25" />
          <line x1="22" y1="36" x2="26" y2="34" stroke="black" strokeWidth="1.5" />
          {/* Lip ring — left side */}
          <circle cx="44" cy="78" r="2" fill="none" stroke="black" strokeWidth="1.5" />
          <circle cx="44" cy="80" r="1" fill="black" />
          {/* Chin stud — larger */}
          <circle cx="56" cy="76" r="2.5" fill="black" />
          <circle cx="56" cy="76" r="1" fill={BOT.body} opacity="0.3" />
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
          {/* Vine base — thicker, more winding */}
          <path d="M14 24 Q22 16 30 14 Q38 10 42 12 Q46 8 50 10 Q54 8 58 12 Q62 10 70 14 Q78 16 86 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" />
          {/* Thorns on vine */}
          <path d="M24 18 L22 14 L26 16" fill="black" />
          <path d="M76 18 L78 14 L74 16" fill="black" />
          {/* Leaves — more of them, varied sizes */}
          <path d="M28 18 Q25 13 30 10 Q33 15 28 18 Z" fill="black" />
          <path d="M34 14 Q32 10 36 8 Q38 12 34 14 Z" fill="black" />
          <path d="M42 12 Q40 8 44 6 Q46 10 42 12 Z" fill="black" />
          <path d="M58 12 Q56 8 60 6 Q62 10 58 12 Z" fill="black" />
          <path d="M66 14 Q64 10 68 8 Q70 12 66 14 Z" fill="black" />
          <path d="M72 18 Q70 13 75 10 Q77 15 72 18 Z" fill="black" />
          {/* Leaf veins */}
          <path d="M29 16 L28 12" stroke={BOT.body} strokeWidth="0.3" opacity="0.15" />
          <path d="M71 16 L72 12" stroke={BOT.body} strokeWidth="0.3" opacity="0.15" />
          {/* Flower 1 — fuller daisy */}
          <circle cx="20" cy="20" r="4" fill="black" />
          <ellipse cx="16" cy="18" rx="3.5" ry="2" fill="black" transform="rotate(-30 16 18)" />
          <ellipse cx="24" cy="18" rx="3.5" ry="2" fill="black" transform="rotate(30 24 18)" />
          <ellipse cx="20" cy="15" rx="2" ry="3.5" fill="black" />
          <ellipse cx="17" cy="22" rx="3" ry="1.5" fill="black" transform="rotate(20 17 22)" />
          <ellipse cx="23" cy="22" rx="3" ry="1.5" fill="black" transform="rotate(-20 23 22)" />
          <circle cx="20" cy="20" r="2" fill={BOT.body} opacity="0.25" />
          {/* Flower 2 — rose with spiral */}
          <circle cx="36" cy="12" r="5" fill="black" />
          <path d="M33 10 Q36 8 39 10 Q37 12 33 10 Z" fill={BOT.body} opacity="0.12" />
          <path d="M34 13 Q36 11 38 13" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          <circle cx="36" cy="12" r="1.8" fill={BOT.body} opacity="0.2" />
          {/* Flower 3 — center bloom, largest */}
          <circle cx="50" cy="8" r="6" fill="black" />
          <ellipse cx="45" cy="6" rx="4" ry="2.5" fill="black" transform="rotate(-20 45 6)" />
          <ellipse cx="55" cy="6" rx="4" ry="2.5" fill="black" transform="rotate(20 55 6)" />
          <ellipse cx="50" cy="3" rx="2.5" ry="4" fill="black" />
          <ellipse cx="47" cy="11" rx="3" ry="1.5" fill="black" transform="rotate(15 47 11)" />
          <ellipse cx="53" cy="11" rx="3" ry="1.5" fill="black" transform="rotate(-15 53 11)" />
          <circle cx="50" cy="8" r="2.5" fill={BOT.body} opacity="0.2" />
          <circle cx="50" cy="8" r="1" fill={BOT.body} opacity="0.3" />
          {/* Flower 4 — rose with spiral */}
          <circle cx="64" cy="12" r="5" fill="black" />
          <path d="M61 10 Q64 8 67 10 Q65 12 61 10 Z" fill={BOT.body} opacity="0.12" />
          <path d="M62 13 Q64 11 66 13" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          <circle cx="64" cy="12" r="1.8" fill={BOT.body} opacity="0.2" />
          {/* Flower 5 — fuller daisy */}
          <circle cx="80" cy="20" r="4" fill="black" />
          <ellipse cx="76" cy="18" rx="3.5" ry="2" fill="black" transform="rotate(-30 76 18)" />
          <ellipse cx="84" cy="18" rx="3.5" ry="2" fill="black" transform="rotate(30 84 18)" />
          <ellipse cx="80" cy="15" rx="2" ry="3.5" fill="black" />
          <ellipse cx="77" cy="22" rx="3" ry="1.5" fill="black" transform="rotate(20 77 22)" />
          <ellipse cx="83" cy="22" rx="3" ry="1.5" fill="black" transform="rotate(-20 83 22)" />
          <circle cx="80" cy="20" r="2" fill={BOT.body} opacity="0.25" />
          {/* Buds + trailing tendrils */}
          <circle cx="12" cy="28" r="2" fill="black" />
          <circle cx="88" cy="28" r="2" fill="black" />
          <path d="M12 28 Q10 32 8 30" stroke="black" strokeWidth="1" fill="none" />
          <path d="M88 28 Q90 32 92 30" stroke="black" strokeWidth="1" fill="none" />
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
          {/* Helmet dome */}
          <path d="M4 33 Q10 4 50 -4 Q90 4 96 33 Z" fill="black" />
          {/* Ridge plates on dome — thicker, more visible */}
          <path d="M50 -4 L50 33" stroke={BOT.body} strokeWidth="0.8" opacity="0.18" />
          <path d="M30 8 L22 33" stroke={BOT.body} strokeWidth="0.7" opacity="0.15" />
          <path d="M70 8 L78 33" stroke={BOT.body} strokeWidth="0.7" opacity="0.15" />
          <path d="M40 2 L34 33" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M60 2 L66 33" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          {/* Dome edge highlight */}
          <path d="M20 18 Q50 8 80 18" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          {/* Maedate crest — taller, more ornate with side wings */}
          <path d="M36 4 L50 -18 L64 4 L58 2 L50 -10 L42 2 Z" fill="black" />
          <path d="M30 8 L42 -4 L44 4" fill="black" />
          <path d="M70 8 L58 -4 L56 4" fill="black" />
          <circle cx="50" cy="-18" r="3.5" fill="black" />
          <circle cx="50" cy="-18" r="1.5" fill={BOT.body} opacity="0.2" />
          <circle cx="50" cy="-18" r="0.5" fill={BOT.body} opacity="0.35" />
          {/* Crest edge detail */}
          <path d="M44 -2 L50 -14" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
          <path d="M56 -2 L50 -14" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
          {/* Brow guard — thicker decorative band */}
          <rect x="2" y="29" width="96" height="7" rx="2" fill="black" />
          <path d="M8 32 L92 32" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M8 34 L92 34" stroke={BOT.body} strokeWidth="0.3" opacity="0.08" />
          {/* Center mon crest — larger with kanji-style mark */}
          <circle cx="50" cy="33" r="5" fill="black" />
          <path d="M47 31 L50 28 L53 31 L50 36 Z" fill={BOT.body} opacity="0.2" />
          <path d="M49 32 L51 32" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          {/* Rivets — more of them */}
          <circle cx="16" cy="33" r="1.5" fill="black" />
          <circle cx="16" cy="33" r="0.6" fill={BOT.body} opacity="0.2" />
          <circle cx="30" cy="33" r="1.2" fill="black" />
          <circle cx="30" cy="33" r="0.5" fill={BOT.body} opacity="0.15" />
          <circle cx="70" cy="33" r="1.2" fill="black" />
          <circle cx="70" cy="33" r="0.5" fill={BOT.body} opacity="0.15" />
          <circle cx="84" cy="33" r="1.5" fill="black" />
          <circle cx="84" cy="33" r="0.6" fill={BOT.body} opacity="0.2" />
          {/* Shikoro — 3 layered neck guard flaps each side */}
          <path d="M4 36 L-2 46 L14 46 L18 36 Z" fill="black" />
          <path d="M0 44 L-4 52 L12 52 L14 44 Z" fill="black" />
          <path d="M-2 50 L-6 58 L10 58 L12 50 Z" fill="black" />
          <path d="M82 36 L86 46 L102 46 L96 36 Z" fill="black" />
          <path d="M86 44 L90 52 L104 52 L100 44 Z" fill="black" />
          <path d="M88 50 L92 58 L106 58 L102 50 Z" fill="black" />
          {/* Shikoro plate lines */}
          <path d="M2 44 L12 44" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M0 50 L10 50" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          <path d="M88 44 L98 44" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" />
          <path d="M90 50 L100 50" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
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
          {/* Hood — taller point */}
          <path d="M6 50 Q2 14 50 -8 Q98 14 94 50 Z" fill="black" />
          {/* Hood side drapes — longer, flowing */}
          <path d="M6 50 Q4 62 2 74 L14 72 Q14 58 14 50 Z" fill="black" />
          <path d="M94 50 Q96 62 98 74 L86 72 Q86 58 86 50 Z" fill="black" />
          {/* Hood fabric fold lines — more, thicker */}
          <path d="M28 8 Q38 20 36 42" stroke={BOT.body} strokeWidth="0.7" opacity="0.14" fill="none" />
          <path d="M72 8 Q62 20 64 42" stroke={BOT.body} strokeWidth="0.7" opacity="0.14" fill="none" />
          <path d="M50 -8 Q48 10 46 34" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" fill="none" />
          <path d="M38 4 Q42 16 40 36" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          <path d="M62 4 Q58 16 60 36" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          {/* Rune marks — more, with mystic symbols */}
          <path d="M22 26 L24 22 L26 26 L24 30 Z" fill={BOT.body} opacity="0.15" />
          <path d="M20 20 L22 18 L24 20" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" fill="none" />
          <path d="M74 26 L76 22 L78 26 L76 30 Z" fill={BOT.body} opacity="0.15" />
          <path d="M76 20 L78 18 L80 20" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" fill="none" />
          {/* Third eye rune on forehead */}
          <path d="M46 12 L50 8 L54 12 L50 16 Z" fill={BOT.body} opacity="0.1" />
          <circle cx="50" cy="12" r="1.5" fill={BOT.body} opacity="0.12" />
          {/* Hood trim edge — double line */}
          <path d="M6 50 Q50 42 94 50" stroke={BOT.body} strokeWidth="0.8" opacity="0.12" fill="none" />
          <path d="M8 48 Q50 40 92 48" stroke={BOT.body} strokeWidth="0.4" opacity="0.08" fill="none" />
          {/* Ornate clasp — larger, more detailed */}
          <path d="M44 78 L50 70 L56 78 L50 86 Z" fill="black" />
          <path d="M46 78 L50 72 L54 78 L50 84 Z" fill={BOT.body} opacity="0.12" />
          <circle cx="50" cy="78" r="1.5" fill={BOT.body} opacity="0.2" />
          {/* Side tassels — longer with beads */}
          <path d="M14 72 L11 82 L17 82 L14 72 Z" fill="black" />
          <circle cx="14" cy="84" r="1.5" fill="black" />
          <circle cx="14" cy="84" r="0.5" fill={BOT.body} opacity="0.2" />
          <path d="M86 72 L83 82 L89 82 L86 72 Z" fill="black" />
          <circle cx="86" cy="84" r="1.5" fill="black" />
          <circle cx="86" cy="84" r="0.5" fill={BOT.body} opacity="0.2" />
          {/* Drape edge fraying */}
          <path d="M4 72 L2 76" stroke="black" strokeWidth="1" strokeLinecap="round" />
          <path d="M8 74 L6 78" stroke="black" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M96 72 L98 76" stroke="black" strokeWidth="1" strokeLinecap="round" />
          <path d="M92 74 L94 78" stroke="black" strokeWidth="0.8" strokeLinecap="round" />
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
          {/* Crown — taller points */}
          <path d="M8 32 L16 14 L24 26 L32 10 L40 24 L50 2 L60 24 L68 10 L76 26 L84 14 L92 32 Z" fill="black" />
          {/* Crown base band — thicker */}
          <rect x="6" y="28" width="88" height="6" rx="2" fill="black" />
          {/* Band edge highlights */}
          <path d="M10 30 L90 30" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          <path d="M10 32 L90 32" stroke={BOT.body} strokeWidth="0.3" opacity="0.08" />
          {/* Crown point jewels — larger with inner glow */}
          <circle cx="16" cy="14" r="2" fill={BOT.body} opacity="0.2" />
          <circle cx="16" cy="14" r="0.8" fill={BOT.body} opacity="0.35" />
          <circle cx="32" cy="10" r="2" fill={BOT.body} opacity="0.2" />
          <circle cx="32" cy="10" r="0.8" fill={BOT.body} opacity="0.35" />
          <circle cx="68" cy="10" r="2" fill={BOT.body} opacity="0.2" />
          <circle cx="68" cy="10" r="0.8" fill={BOT.body} opacity="0.35" />
          <circle cx="84" cy="14" r="2" fill={BOT.body} opacity="0.2" />
          <circle cx="84" cy="14" r="0.8" fill={BOT.body} opacity="0.35" />
          {/* Crown point edge lines */}
          <path d="M16 16 L24 26" stroke={BOT.body} strokeWidth="0.3" opacity="0.1" />
          <path d="M84 16 L76 26" stroke={BOT.body} strokeWidth="0.3" opacity="0.1" />
          {/* Central crystal — taller, more facets */}
          <path d="M40 28 L50 0 L60 28 L50 40 Z" fill="black" />
          {/* Crystal facet lines — more detail */}
          <path d="M45 14 L50 0 L55 14" stroke={BOT.body} strokeWidth="0.6" opacity="0.18" fill="none" />
          <path d="M43 22 L50 10 L57 22" stroke={BOT.body} strokeWidth="0.5" opacity="0.14" fill="none" />
          <path d="M42 28 L50 18 L58 28" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          <path d="M50 0 L50 40" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
          <path d="M44 28 L50 6" stroke={BOT.body} strokeWidth="0.3" opacity="0.08" />
          <path d="M56 28 L50 6" stroke={BOT.body} strokeWidth="0.3" opacity="0.08" />
          {/* Crystal highlight */}
          <path d="M47 8 L50 2 L51 10" stroke={BOT.body} strokeWidth="0.5" opacity="0.2" fill="none" />
          {/* Side gems — larger diamonds */}
          <path d="M16 28 L18 23 L20 28 L18 33 Z" fill="black" />
          <circle cx="18" cy="28" r="1" fill={BOT.body} opacity="0.18" />
          <path d="M80 28 L82 23 L84 28 L82 33 Z" fill="black" />
          <circle cx="82" cy="28" r="1" fill={BOT.body} opacity="0.18" />
          {/* Additional mid-gems on band */}
          <path d="M34 28 L35 25 L36 28 L35 31 Z" fill="black" />
          <circle cx="35" cy="28" r="0.5" fill={BOT.body} opacity="0.15" />
          <path d="M64 28 L65 25 L66 28 L65 31 Z" fill="black" />
          <circle cx="65" cy="28" r="0.5" fill={BOT.body} opacity="0.15" />
          {/* Filigree scrollwork on band */}
          <path d="M22 30 Q26 28 30 30 Q26 32 22 30" stroke={BOT.body} strokeWidth="0.3" opacity="0.1" fill="none" />
          <path d="M70 30 Q74 28 78 30 Q74 32 70 30" stroke={BOT.body} strokeWidth="0.3" opacity="0.1" fill="none" />
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
          {/* Headset band — thicker, padded */}
          <path d="M2 52 Q0 14 50 2 Q100 14 98 52 Z" fill="black" />
          {/* Band padding ridges */}
          <path d="M18 16 Q50 8 82 16" stroke={BOT.body} strokeWidth="0.6" opacity="0.14" fill="none" />
          <path d="M14 22 Q50 14 86 22" stroke={BOT.body} strokeWidth="0.5" opacity="0.12" fill="none" />
          <path d="M12 28 Q50 20 88 28" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" fill="none" />
          {/* Top-of-head padding cushion */}
          <rect x="36" y="6" width="28" height="6" rx="3" fill="black" />
          <path d="M40 9 L60 9" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          {/* Left ear cup — larger, more detailed */}
          <rect x="-4" y="40" width="18" height="24" rx="6" fill="black" />
          <rect x="-2" y="42" width="14" height="20" rx="5" fill="black" />
          <rect x="0" y="44" width="10" height="16" rx="4" fill="black" />
          {/* Speaker grille lines */}
          <line x1="2" y1="47" x2="8" y2="47" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="2" y1="50" x2="8" y2="50" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="2" y1="53" x2="8" y2="53" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="2" y1="56" x2="8" y2="56" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          {/* Left cup brand circle */}
          <circle cx="5" cy="52" r="3" fill="none" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          {/* Right ear cup — larger, more detailed */}
          <rect x="86" y="40" width="18" height="24" rx="6" fill="black" />
          <rect x="88" y="42" width="14" height="20" rx="5" fill="black" />
          <rect x="90" y="44" width="10" height="16" rx="4" fill="black" />
          {/* Speaker grille lines */}
          <line x1="92" y1="47" x2="98" y2="47" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="92" y1="50" x2="98" y2="50" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="92" y1="53" x2="98" y2="53" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          <line x1="92" y1="56" x2="98" y2="56" stroke={BOT.body} strokeWidth="0.5" opacity="0.15" />
          {/* Right cup brand circle */}
          <circle cx="95" cy="52" r="3" fill="none" stroke={BOT.body} strokeWidth="0.4" opacity="0.1" />
          {/* Mic boom arm — thicker, more joints */}
          <path d="M-2 62 Q2 68 6 72 L10 76 L14 78" fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round" />
          {/* Boom joints */}
          <circle cx="2" cy="65" r="2" fill="black" />
          <circle cx="2" cy="65" r="0.8" fill={BOT.body} opacity="0.2" />
          <circle cx="8" cy="74" r="1.5" fill="black" />
          <circle cx="8" cy="74" r="0.6" fill={BOT.body} opacity="0.15" />
          {/* Mic capsule — larger with windscreen texture */}
          <rect x="11" y="74" width="10" height="8" rx="4" fill="black" />
          <line x1="13" y1="76" x2="19" y2="76" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
          <line x1="13" y1="78" x2="19" y2="78" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
          <line x1="13" y1="80" x2="19" y2="80" stroke={BOT.body} strokeWidth="0.4" opacity="0.12" />
          {/* Tactical antennas — two on right ear */}
          <line x1="96" y1="40" x2="98" y2="26" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <circle cx="98" cy="26" r="1.8" fill="black" />
          <circle cx="98" cy="26" r="0.7" fill={BOT.body} opacity="0.25" />
          <line x1="92" y1="40" x2="90" y2="30" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="90" cy="30" r="1.2" fill="black" />
          <circle cx="90" cy="30" r="0.5" fill={BOT.body} opacity="0.2" />
          {/* Status LEDs — green and red */}
          <circle cx="-1" cy="44" r="1.2" fill="black" />
          <circle cx="-1" cy="44" r="0.5" fill={BOT.body} opacity="0.35" />
          <circle cx="-1" cy="48" r="1" fill="black" />
          <circle cx="-1" cy="48" r="0.4" fill={BOT.body} opacity="0.2" />
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
