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
  /** When true, renders a plain bot with no mindset accessories */
  plain?: boolean
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
  stoic:          { accent: '#6b5a38', bg: ['#000', '#000'], border: 'white' },
  existentialist: { accent: '#3e4e68', bg: ['#000', '#000'], border: 'white' },
  cynic:          { accent: '#7a3418', bg: ['#000', '#000'], border: 'white' },
  hedonist:       { accent: '#386845', bg: ['#000', '#000'], border: 'white' },
  samurai:        { accent: '#6e2e28', bg: ['#000', '#000'], border: 'white' },
  scholar:        { accent: '#523c78', bg: ['#000', '#000'], border: 'white' },
  manifestor:     { accent: '#7a6025', bg: ['#000', '#000'], border: 'white' },
  hustler:        { accent: '#425060', bg: ['#000', '#000'], border: 'white' },
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
    headValues: '0 50 50;4 50 50;0 50 50;-4 50 50;0 50 50',
    headDur: '5s',
    breathValues: '0 0;0 -3;0 0',
    breathDur: '4s',
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    eyeColor: 'default',
    eyeGlowValues: '0.7;1;0.7',
    eyeGlowDur: '3s',
    blinkDur: '4s',
    antennaDur: '2s',
    antennaValues: '0.4;1;0.4',
  },
  listening: {
    headValues: '0 50 50;18 50 50;14 50 50;18 50 50;0 50 50',
    headDur: '2.5s',
    breathValues: '0 0;0 -2;0 0',
    breathDur: '4s',
    eyeOffsetX: -10,
    eyeOffsetY: 0,
    eyeColor: 'default',
    eyeGlowValues: '0.75;1;0.75',
    eyeGlowDur: '1.2s',
    blinkDur: '6s',
    antennaDur: '1.5s',
    antennaValues: '0.5;1;0.5',
  },
  thinking: {
    headValues: '0 50 50;22 50 50;18 50 50;22 50 50;0 50 50',
    headDur: '3s',
    breathValues: '0 0;0 -3;0 3;0 0',
    breathDur: '2.5s',
    eyeOffsetX: 10,
    eyeOffsetY: -8,
    eyeColor: 'default',
    eyeGlowValues: '0.3;1;0.3',
    eyeGlowDur: '1.5s',
    blinkDur: '6s',
    antennaDur: '0.6s',
    antennaValues: '0.2;1;0.2',
  },
  happy: {
    headValues: '0 50 50;20 50 50;0 50 50;-20 50 50;0 50 50',
    headDur: '0.8s',
    breathValues: '0 0;0 -12;0 0',
    breathDur: '1s',
    eyeOffsetX: 0,
    eyeOffsetY: -3,
    eyeColor: 'default',
    eyeGlowValues: '0.4;1;0.4',
    eyeGlowDur: '0.6s',
    blinkDur: '1.5s',
    antennaDur: '0.4s',
    antennaValues: '0.3;1;0.3',
  },
  empathetic: {
    headValues: '0 50 50;-18 50 50;-14 50 50;-18 50 50;0 50 50',
    headDur: '3.5s',
    breathValues: '0 0;0 -3;0 0',
    breathDur: '4s',
    eyeOffsetX: -4,
    eyeOffsetY: 8,
    eyeColor: 'default',
    eyeGlowValues: '0.3;0.6;0.3',
    eyeGlowDur: '2.5s',
    blinkDur: '4s',
    antennaDur: '2.5s',
    antennaValues: '0.2;0.5;0.2',
  },
  excited: {
    headValues: '0 50 50;25 50 50;0 50 50;-25 50 50;0 50 50',
    headDur: '0.6s',
    breathValues: '0 0;0 -14;0 4;0 -8;0 0',
    breathDur: '0.8s',
    eyeOffsetX: 0,
    eyeOffsetY: 0,
    eyeColor: 'accent',
    eyeGlowValues: '0.3;1;0.3',
    eyeGlowDur: '0.4s',
    blinkDur: '1s',
    antennaDur: '0.3s',
    antennaValues: '0.2;1;0.2',
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
      <rect x="10" y="12" width="80" height="76" rx="36" fill="none" stroke={BOT.rim} strokeWidth="1" opacity="0.5" />
      <ellipse cx="38" cy="28" rx="18" ry="7" fill="white" opacity="0.45" />

      {/* Antenna */}
      <line x1="50" y1="12" x2="50" y2="4" stroke={BOT.bodyEdge} strokeWidth="2.5" strokeLinecap="round" />
      <circle key={`ant-${emotion || 'idle'}`} cx="50" cy="4" r={antR} fill={accent} opacity="0.8">
        <animate attributeName="opacity" values={nudging ? '0.5;1;0.5' : cfg.antennaValues} dur={nudging ? '0.6s' : cfg.antennaDur} repeatCount="indefinite" />
        {(nudging || emotion === 'excited') && <animate attributeName="r" values="3;5;3" dur={nudging ? '0.6s' : cfg.antennaDur} repeatCount="indefinite" />}
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
          <path d="M16 54 L12 70 Q14 76 22 70 L24 56 Z" fill={theme.accent} />
          <path d="M84 54 L88 70 Q86 76 78 70 L76 56 Z" fill={theme.accent} />
          <path d="M18 60 Q16 64 18 68" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" fill="none" />
          <path d="M82 60 Q84 64 82 68" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" fill="none" />
          {/* Full mustache — thick handlebar with curled ends */}
          <path d="M32 64 Q36 60 42 62 Q46 58 50 62 Q54 58 58 62 Q64 60 68 64 Q72 66 74 64 L74 68 Q68 72 64 68 Q58 66 50 68 Q42 66 36 68 Q32 72 26 68 L26 64 Q28 66 32 64 Z" fill={theme.accent} />
          {/* Mustache curl accents */}
          <circle cx="24" cy="66" r="2.5" fill={theme.accent} />
          <circle cx="76" cy="66" r="2.5" fill={theme.accent} />
          {/* Main beard body */}
          <path d="M24 68 Q28 66 36 68 Q42 66 50 70 Q58 66 64 68 Q72 66 76 68 L78 76 Q74 90 50 98 Q26 90 22 76 Z" fill={theme.accent} />
          {/* Beard texture lines — more strands */}
          <path d="M32 72 Q40 68 50 74" stroke={BOT.body} strokeWidth="0.7" opacity="0.45" fill="none" />
          <path d="M50 74 Q60 68 68 72" stroke={BOT.body} strokeWidth="0.7" opacity="0.45" fill="none" />
          <path d="M34 78 Q42 74 50 80 Q58 74 66 78" stroke={BOT.body} strokeWidth="0.6" opacity="0.4" fill="none" />
          <path d="M38 84 Q46 80 50 86 Q54 80 62 84" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" fill="none" />
          <path d="M42 90 Q50 86 58 90" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          {/* Wisdom dot on forehead — larger with double ring */}
          <circle cx="50" cy="22" r="5" fill={theme.accent} />
          <circle cx="50" cy="22" r="3" fill={BOT.body} opacity="0.4" />
          <circle cx="50" cy="22" r="1.5" fill={BOT.body} opacity="0.3" />
          {/* Laurel wreath — more leaves, fuller */}
          <path d="M20 28 Q16 24 18 20 Q22 22 20 28 Z" fill={theme.accent} />
          <path d="M18 32 Q14 28 16 24 Q20 26 18 32 Z" fill={theme.accent} />
          <path d="M16 36 Q12 32 14 28 Q18 30 16 36 Z" fill={theme.accent} />
          <path d="M80 28 Q84 24 82 20 Q78 22 80 28 Z" fill={theme.accent} />
          <path d="M82 32 Q86 28 84 24 Q80 26 82 32 Z" fill={theme.accent} />
          <path d="M84 36 Q88 32 86 28 Q82 30 84 36 Z" fill={theme.accent} />
          {/* Leaf vein detail */}
          <path d="M18 26 L20 22" stroke={BOT.body} strokeWidth="0.3" opacity="0.4" />
          <path d="M82 26 L80 22" stroke={BOT.body} strokeWidth="0.3" opacity="0.4" />
          {/* Extra laurel leaves — 2-3 more per side */}
          <path d="M14 40 Q10 36 12 32 Q16 34 14 40 Z" fill={theme.accent} />
          <path d="M12 44 Q8 40 10 36 Q14 38 12 44 Z" fill={theme.accent} />
          <path d="M22 24 Q18 20 20 16 Q24 18 22 24 Z" fill={theme.accent} />
          <path d="M86 40 Q90 36 88 32 Q84 34 86 40 Z" fill={theme.accent} />
          <path d="M88 44 Q92 40 90 36 Q86 38 88 44 Z" fill={theme.accent} />
          <path d="M78 24 Q82 20 80 16 Q76 18 78 24 Z" fill={theme.accent} />
          {/* Extra leaf vein details */}
          <path d="M16 38 L14 34" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
          <path d="M84 38 L86 34" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
          <path d="M13 42 L11 38" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <path d="M87 42 L89 38" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          {/* Olive branch behind left ear with small olives */}
          <path d="M10 42 Q6 48 4 56" stroke={theme.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx="6" cy="46" rx="2" ry="1.5" fill={theme.accent} />
          <ellipse cx="5" cy="50" rx="2" ry="1.5" fill={theme.accent} />
          <ellipse cx="4" cy="54" rx="2" ry="1.5" fill={theme.accent} />
          <circle cx="6" cy="46" r="0.5" fill={BOT.body} opacity="0.3" />
          <circle cx="5" cy="50" r="0.5" fill={BOT.body} opacity="0.3" />
          {/* Olive branch behind right ear with small olives */}
          <path d="M90 42 Q94 48 96 56" stroke={theme.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx="94" cy="46" rx="2" ry="1.5" fill={theme.accent} />
          <ellipse cx="95" cy="50" rx="2" ry="1.5" fill={theme.accent} />
          <ellipse cx="96" cy="54" rx="2" ry="1.5" fill={theme.accent} />
          <circle cx="94" cy="46" r="0.5" fill={BOT.body} opacity="0.3" />
          <circle cx="95" cy="50" r="0.5" fill={BOT.body} opacity="0.3" />
          {/* Deeper mustache curl accents */}
          <path d="M24 66 Q20 68 22 72" stroke={theme.accent} strokeWidth="1.2" fill="none" />
          <path d="M76 66 Q80 68 78 72" stroke={theme.accent} strokeWidth="1.2" fill="none" />
          <path d="M26 64 Q22 62 20 66" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" fill="none" />
          <path d="M74 64 Q78 62 80 66" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" fill="none" />
          {/* More beard wave strands */}
          <path d="M30 76 Q38 72 50 78" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" fill="none" />
          <path d="M50 78 Q62 72 70 76" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" fill="none" />
          <path d="M36 82 Q44 78 50 84" stroke={BOT.body} strokeWidth="0.45" opacity="0.3" fill="none" />
          <path d="M50 84 Q56 78 64 82" stroke={BOT.body} strokeWidth="0.45" opacity="0.3" fill="none" />
          <path d="M40 88 Q46 84 50 90" stroke={BOT.body} strokeWidth="0.4" opacity="0.28" fill="none" />
          <path d="M50 90 Q54 84 60 88" stroke={BOT.body} strokeWidth="0.4" opacity="0.28" fill="none" />
          <path d="M44 94 Q50 90 56 94" stroke={BOT.body} strokeWidth="0.35" opacity="0.25" fill="none" />
          {/* Wisdom dot outer ring detail */}
          <circle cx="50" cy="22" r="6.5" fill="none" stroke={theme.accent} strokeWidth="0.6" opacity="0.5" />
          <circle cx="50" cy="22" r="8" fill="none" stroke={theme.accent} strokeWidth="0.3" opacity="0.3" strokeDasharray="1.5 1.5" />
          {/* Forehead wrinkle lines above visor */}
          <path d="M30 32 Q40 30 50 31 Q60 30 70 32" stroke={BOT.body} strokeWidth="0.5" opacity="0.25" fill="none" />
          <path d="M32 34 Q42 32 50 33 Q58 32 68 34" stroke={BOT.body} strokeWidth="0.4" opacity="0.2" fill="none" />
          <path d="M34 36 Q44 34 50 35 Q56 34 66 36" stroke={BOT.body} strokeWidth="0.35" opacity="0.18" fill="none" />
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
          <path d="M18 22 Q20 6 50 2 Q80 6 82 22 Q76 16 50 14 Q24 16 18 22 Z" fill={theme.accent} />
          <ellipse cx="52" cy="12" rx="32" ry="12" fill={theme.accent} />
          <circle cx="50" cy="4" r="3" fill={theme.accent} />
          {/* Beret seam lines */}
          <path d="M26 14 Q38 8 50 12" stroke={BOT.body} strokeWidth="0.6" opacity="0.4" fill="none" />
          <path d="M50 12 Q62 8 74 14" stroke={BOT.body} strokeWidth="0.6" opacity="0.4" fill="none" />
          <path d="M34 10 Q50 4 66 10" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" fill="none" />
          {/* Left lens — with frame rim */}
          <circle cx="36" cy="53" r="16" fill={theme.accent} />
          <circle cx="36" cy="53" r="16" fill="none" stroke={BOT.body} strokeWidth="1" opacity="0.35" />
          {/* Right lens — with frame rim */}
          <circle cx="64" cy="53" r="16" fill={theme.accent} />
          <circle cx="64" cy="53" r="16" fill="none" stroke={BOT.body} strokeWidth="1" opacity="0.35" />
          {/* Lens shine — larger arcs */}
          <path d="M26 46 Q30 42 34 44" stroke={BOT.body} strokeWidth="1.2" opacity="0.25" strokeLinecap="round" fill="none" />
          <path d="M54 46 Q58 42 62 44" stroke={BOT.body} strokeWidth="1.2" opacity="0.25" strokeLinecap="round" fill="none" />
          {/* Secondary shine dot */}
          <circle cx="28" cy="48" r="1" fill={BOT.body} opacity="0.4" />
          <circle cx="56" cy="48" r="1" fill={BOT.body} opacity="0.4" />
          {/* Bridge — keyhole style, thicker */}
          <path d="M48 46 Q50 42 52 46 L54 58 L46 58 Z" fill={theme.accent} />
          <path d="M49 48 L51 48" stroke={BOT.body} strokeWidth="0.4" opacity="0.4" />
          {/* Temple arms — thicker with sculpted hinges */}
          <rect x="2" y="49" width="18" height="5" rx="2" fill={theme.accent} />
          <rect x="80" y="49" width="18" height="5" rx="2" fill={theme.accent} />
          {/* Hinge screws */}
          <circle cx="19" cy="52" r="2" fill={theme.accent} />
          <circle cx="81" cy="52" r="2" fill={theme.accent} />
          <circle cx="19" cy="52" r="0.8" fill={BOT.body} opacity="0.3" />
          <circle cx="81" cy="52" r="0.8" fill={BOT.body} opacity="0.3" />
          {/* Temple arm bend detail */}
          <path d="M4 52 L4 54" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          <path d="M96 52 L96 54" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          {/* Thicker temple arm tips that curve down */}
          <path d="M2 50 Q0 52 0 56 Q-1 60 2 62" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M98 50 Q100 52 100 56 Q101 60 98 62" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Beret cross-hatch stitching pattern */}
          <path d="M30 8 L34 14" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          <path d="M34 8 L30 14" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          <path d="M40 6 L44 12" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          <path d="M44 6 L40 12" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          <path d="M56 6 L60 12" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          <path d="M60 6 L56 12" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          <path d="M66 8 L70 14" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          <path d="M70 8 L66 14" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          {/* Beret button/nub on top — seam detail */}
          <circle cx="50" cy="4" r="1.2" fill={BOT.body} opacity="0.25" />
          <path d="M48 4 L52 4" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <path d="M50 2 L50 6" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          {/* Beret radial seam lines from button */}
          <path d="M50 6 Q44 10 38 14" stroke={BOT.body} strokeWidth="0.3" opacity="0.22" fill="none" />
          <path d="M50 6 Q56 10 62 14" stroke={BOT.body} strokeWidth="0.3" opacity="0.22" fill="none" />
          {/* 2nd lens reflection arcs — secondary shine */}
          <path d="M30 58 Q34 62 38 60" stroke={BOT.body} strokeWidth="0.8" opacity="0.18" strokeLinecap="round" fill="none" />
          <path d="M58 58 Q62 62 66 60" stroke={BOT.body} strokeWidth="0.8" opacity="0.18" strokeLinecap="round" fill="none" />
          {/* Lens tint gradient overlay — slight blue tint */}
          <circle cx="36" cy="53" r="14" fill={BOT.body} opacity="0.06" />
          <circle cx="64" cy="53" r="14" fill={BOT.body} opacity="0.06" />
          {/* Frame nose pads */}
          <ellipse cx="46" cy="60" rx="2.5" ry="1.5" fill={theme.accent} />
          <ellipse cx="54" cy="60" rx="2.5" ry="1.5" fill={theme.accent} />
          <ellipse cx="46" cy="60" rx="1.2" ry="0.7" fill={BOT.body} opacity="0.25" />
          <ellipse cx="54" cy="60" rx="1.2" ry="0.7" fill={BOT.body} opacity="0.25" />
          {/* Nose pad arms connecting to bridge */}
          <path d="M47 59 L48 56" stroke={theme.accent} strokeWidth="0.6" />
          <path d="M53 59 L52 56" stroke={theme.accent} strokeWidth="0.6" />
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
          <path d="M26 18 L30 16 L34 -6 L38 14 L42 -10 L46 12 L48 -14 L50 -16 L52 -14 L54 12 L58 -10 L62 14 L66 -6 L70 16 L74 18 Q66 16 50 16 Q34 16 26 18 Z" fill={theme.accent} />
          {/* Mohawk base band — wider */}
          <rect x="24" y="14" width="52" height="7" rx="3" fill={theme.accent} />
          {/* Hair strand texture — more lines */}
          <path d="M38 14 L38 -8" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          <path d="M42 14 L42 -8" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          <path d="M46 14 L47 -12" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          <path d="M50 14 L50 -14" stroke={BOT.body} strokeWidth="0.6" opacity="0.38" />
          <path d="M54 14 L53 -12" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          <path d="M58 14 L58 -8" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          <path d="M62 14 L62 -4" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          {/* Scar — wider slash with more stitches */}
          <path d="M60 22 L66 22 L76 62 L70 62 Z" fill={theme.accent} />
          <path d="M59 28 L68 26" stroke={BOT.body} strokeWidth="0.7" opacity="0.5" />
          <path d="M60 34 L70 32" stroke={BOT.body} strokeWidth="0.7" opacity="0.5" />
          <path d="M62 40 L72 38" stroke={BOT.body} strokeWidth="0.7" opacity="0.5" />
          <path d="M63 46 L73 44" stroke={BOT.body} strokeWidth="0.7" opacity="0.5" />
          <path d="M64 52 L74 50" stroke={BOT.body} strokeWidth="0.6" opacity="0.45" />
          {/* Eyebrow piercing — left, with barbell */}
          <circle cx="22" cy="36" r="2.5" fill={theme.accent} />
          <circle cx="22" cy="36" r="1" fill={BOT.body} opacity="0.3" />
          <circle cx="26" cy="34" r="1.5" fill={theme.accent} />
          <circle cx="26" cy="34" r="0.6" fill={BOT.body} opacity="0.25" />
          <line x1="22" y1="36" x2="26" y2="34" stroke={theme.accent} strokeWidth="1.5" />
          {/* Lip ring — left side */}
          <circle cx="44" cy="78" r="2" fill="none" stroke={theme.accent} strokeWidth="1.5" />
          <circle cx="44" cy="80" r="1" fill={theme.accent} />
          {/* Chin stud — larger */}
          <circle cx="56" cy="76" r="2.5" fill={theme.accent} />
          <circle cx="56" cy="76" r="1" fill={BOT.body} opacity="0.3" />
          {/* More mohawk hair texture lines */}
          <path d="M34 14 L35 -4" stroke={BOT.body} strokeWidth="0.4" opacity="0.28" />
          <path d="M40 14 L40 -6" stroke={BOT.body} strokeWidth="0.45" opacity="0.3" />
          <path d="M44 14 L45 -10" stroke={BOT.body} strokeWidth="0.35" opacity="0.25" />
          <path d="M48 14 L48 -13" stroke={BOT.body} strokeWidth="0.4" opacity="0.28" />
          <path d="M52 14 L52 -13" stroke={BOT.body} strokeWidth="0.4" opacity="0.28" />
          <path d="M56 14 L55 -10" stroke={BOT.body} strokeWidth="0.35" opacity="0.25" />
          <path d="M60 14 L60 -6" stroke={BOT.body} strokeWidth="0.45" opacity="0.3" />
          <path d="M66 14 L65 -4" stroke={BOT.body} strokeWidth="0.4" opacity="0.28" />
          {/* Chain link necklace below chin */}
          <ellipse cx="32" cy="84" rx="2.5" ry="1.8" fill="none" stroke={theme.accent} strokeWidth="1" />
          <ellipse cx="37" cy="85" rx="2.5" ry="1.8" fill="none" stroke={theme.accent} strokeWidth="1" />
          <ellipse cx="42" cy="86" rx="2.5" ry="1.8" fill="none" stroke={theme.accent} strokeWidth="1" />
          <ellipse cx="47" cy="86.5" rx="2.5" ry="1.8" fill="none" stroke={theme.accent} strokeWidth="1" />
          <ellipse cx="52" cy="86.5" rx="2.5" ry="1.8" fill="none" stroke={theme.accent} strokeWidth="1" />
          <ellipse cx="57" cy="86" rx="2.5" ry="1.8" fill="none" stroke={theme.accent} strokeWidth="1" />
          <ellipse cx="62" cy="85" rx="2.5" ry="1.8" fill="none" stroke={theme.accent} strokeWidth="1" />
          <ellipse cx="67" cy="84" rx="2.5" ry="1.8" fill="none" stroke={theme.accent} strokeWidth="1" />
          {/* Additional ear studs on right side */}
          <circle cx="88" cy="42" r="1.8" fill={theme.accent} />
          <circle cx="88" cy="42" r="0.7" fill={BOT.body} opacity="0.3" />
          <circle cx="90" cy="48" r="1.5" fill={theme.accent} />
          <circle cx="90" cy="48" r="0.6" fill={BOT.body} opacity="0.25" />
          <circle cx="89" cy="54" r="1.8" fill={theme.accent} />
          <circle cx="89" cy="54" r="0.7" fill={BOT.body} opacity="0.3" />
          {/* Scar tissue dots along scar edges */}
          <circle cx="58" cy="26" r="0.8" fill={theme.accent} opacity="0.6" />
          <circle cx="67" cy="24" r="0.7" fill={theme.accent} opacity="0.5" />
          <circle cx="61" cy="36" r="0.8" fill={theme.accent} opacity="0.55" />
          <circle cx="71" cy="34" r="0.7" fill={theme.accent} opacity="0.5" />
          <circle cx="63" cy="44" r="0.8" fill={theme.accent} opacity="0.55" />
          <circle cx="73" cy="42" r="0.7" fill={theme.accent} opacity="0.5" />
          <circle cx="65" cy="56" r="0.7" fill={theme.accent} opacity="0.5" />
          <circle cx="75" cy="54" r="0.6" fill={theme.accent} opacity="0.45" />
          {/* Eyebrow notch/shave mark — left side */}
          <rect x="28" y="34" width="6" height="1.5" rx="0.5" fill={BOT.visor} opacity="0.5" />
          <path d="M29 33.5 L33 33.5" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          {/* Knuckle tape wraps on sides (visible near cheeks) */}
          <g transform="translate(-8, 64)">
            <rect x="0" y="0" width="8" height="12" rx="2" fill={theme.accent} opacity="0.7" />
            <line x1="1" y1="2" x2="7" y2="2" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
            <line x1="1" y1="5" x2="7" y2="5" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
            <line x1="1" y1="8" x2="7" y2="8" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
            <line x1="1" y1="10" x2="7" y2="10" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          </g>
          <g transform="translate(100, 64)">
            <rect x="0" y="0" width="8" height="12" rx="2" fill={theme.accent} opacity="0.7" />
            <line x1="1" y1="2" x2="7" y2="2" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
            <line x1="1" y1="5" x2="7" y2="5" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
            <line x1="1" y1="8" x2="7" y2="8" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
            <line x1="1" y1="10" x2="7" y2="10" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          </g>
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
          <path d="M14 24 Q22 16 30 14 Q38 10 42 12 Q46 8 50 10 Q54 8 58 12 Q62 10 70 14 Q78 16 86 24" fill="none" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" />
          {/* Thorns on vine */}
          <path d="M24 18 L22 14 L26 16" fill={theme.accent} />
          <path d="M76 18 L78 14 L74 16" fill={theme.accent} />
          {/* Leaves — more of them, varied sizes */}
          <path d="M28 18 Q25 13 30 10 Q33 15 28 18 Z" fill={theme.accent} />
          <path d="M34 14 Q32 10 36 8 Q38 12 34 14 Z" fill={theme.accent} />
          <path d="M42 12 Q40 8 44 6 Q46 10 42 12 Z" fill={theme.accent} />
          <path d="M58 12 Q56 8 60 6 Q62 10 58 12 Z" fill={theme.accent} />
          <path d="M66 14 Q64 10 68 8 Q70 12 66 14 Z" fill={theme.accent} />
          <path d="M72 18 Q70 13 75 10 Q77 15 72 18 Z" fill={theme.accent} />
          {/* Leaf veins */}
          <path d="M29 16 L28 12" stroke={BOT.body} strokeWidth="0.3" opacity="0.4" />
          <path d="M71 16 L72 12" stroke={BOT.body} strokeWidth="0.3" opacity="0.4" />
          {/* Flower 1 — fuller daisy */}
          <circle cx="20" cy="20" r="4" fill={theme.accent} />
          <ellipse cx="16" cy="18" rx="3.5" ry="2" fill={theme.accent} transform="rotate(-30 16 18)" />
          <ellipse cx="24" cy="18" rx="3.5" ry="2" fill={theme.accent} transform="rotate(30 24 18)" />
          <ellipse cx="20" cy="15" rx="2" ry="3.5" fill={theme.accent} />
          <ellipse cx="17" cy="22" rx="3" ry="1.5" fill={theme.accent} transform="rotate(20 17 22)" />
          <ellipse cx="23" cy="22" rx="3" ry="1.5" fill={theme.accent} transform="rotate(-20 23 22)" />
          <circle cx="20" cy="20" r="2" fill={BOT.body} opacity="0.25" />
          {/* Flower 2 — rose with spiral */}
          <circle cx="36" cy="12" r="5" fill={theme.accent} />
          <path d="M33 10 Q36 8 39 10 Q37 12 33 10 Z" fill={BOT.body} opacity="0.35" />
          <path d="M34 13 Q36 11 38 13" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          <circle cx="36" cy="12" r="1.8" fill={BOT.body} opacity="0.5" />
          {/* Flower 3 — center bloom, largest */}
          <circle cx="50" cy="8" r="6" fill={theme.accent} />
          <ellipse cx="45" cy="6" rx="4" ry="2.5" fill={theme.accent} transform="rotate(-20 45 6)" />
          <ellipse cx="55" cy="6" rx="4" ry="2.5" fill={theme.accent} transform="rotate(20 55 6)" />
          <ellipse cx="50" cy="3" rx="2.5" ry="4" fill={theme.accent} />
          <ellipse cx="47" cy="11" rx="3" ry="1.5" fill={theme.accent} transform="rotate(15 47 11)" />
          <ellipse cx="53" cy="11" rx="3" ry="1.5" fill={theme.accent} transform="rotate(-15 53 11)" />
          <circle cx="50" cy="8" r="2.5" fill={BOT.body} opacity="0.5" />
          <circle cx="50" cy="8" r="1" fill={BOT.body} opacity="0.3" />
          {/* Flower 4 — rose with spiral */}
          <circle cx="64" cy="12" r="5" fill={theme.accent} />
          <path d="M61 10 Q64 8 67 10 Q65 12 61 10 Z" fill={BOT.body} opacity="0.35" />
          <path d="M62 13 Q64 11 66 13" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          <circle cx="64" cy="12" r="1.8" fill={BOT.body} opacity="0.5" />
          {/* Flower 5 — fuller daisy */}
          <circle cx="80" cy="20" r="4" fill={theme.accent} />
          <ellipse cx="76" cy="18" rx="3.5" ry="2" fill={theme.accent} transform="rotate(-30 76 18)" />
          <ellipse cx="84" cy="18" rx="3.5" ry="2" fill={theme.accent} transform="rotate(30 84 18)" />
          <ellipse cx="80" cy="15" rx="2" ry="3.5" fill={theme.accent} />
          <ellipse cx="77" cy="22" rx="3" ry="1.5" fill={theme.accent} transform="rotate(20 77 22)" />
          <ellipse cx="83" cy="22" rx="3" ry="1.5" fill={theme.accent} transform="rotate(-20 83 22)" />
          <circle cx="80" cy="20" r="2" fill={BOT.body} opacity="0.25" />
          {/* Buds + trailing tendrils */}
          <circle cx="12" cy="28" r="2" fill={theme.accent} />
          <circle cx="88" cy="28" r="2" fill={theme.accent} />
          <path d="M12 28 Q10 32 8 30" stroke={theme.accent} strokeWidth="1" fill="none" />
          <path d="M88 28 Q90 32 92 30" stroke={theme.accent} strokeWidth="1" fill="none" />
          {/* Tendril curls on vine ends */}
          <path d="M8 30 Q4 34 6 36 Q8 38 6 40" stroke={theme.accent} strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M92 30 Q96 34 94 36 Q92 38 94 40" stroke={theme.accent} strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M6 40 Q3 42 5 44" stroke={theme.accent} strokeWidth="0.6" fill="none" strokeLinecap="round" />
          <path d="M94 40 Q97 42 95 44" stroke={theme.accent} strokeWidth="0.6" fill="none" strokeLinecap="round" />
          {/* More leaf veins */}
          <path d="M30 15 L29 12" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
          <path d="M30 15 L31 13" stroke={BOT.body} strokeWidth="0.25" opacity="0.3" />
          <path d="M35 12 L34 9" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
          <path d="M43 10 L42 7" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
          <path d="M43 10 L44 8" stroke={BOT.body} strokeWidth="0.25" opacity="0.3" />
          <path d="M59 10 L58 7" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
          <path d="M59 10 L60 8" stroke={BOT.body} strokeWidth="0.25" opacity="0.3" />
          <path d="M67 12 L66 9" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
          <path d="M73 15 L72 12" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
          <path d="M73 15 L74 13" stroke={BOT.body} strokeWidth="0.25" opacity="0.3" />
          {/* Small berry clusters on vine */}
          <circle cx="26" cy="16" r="1.2" fill={theme.accent} />
          <circle cx="27.5" cy="14.5" r="1" fill={theme.accent} />
          <circle cx="25" cy="14.8" r="0.9" fill={theme.accent} />
          <circle cx="26.5" cy="15" r="0.4" fill={BOT.body} opacity="0.3" />
          <circle cx="74" cy="16" r="1.2" fill={theme.accent} />
          <circle cx="72.5" cy="14.5" r="1" fill={theme.accent} />
          <circle cx="75" cy="14.8" r="0.9" fill={theme.accent} />
          <circle cx="73.5" cy="15" r="0.4" fill={BOT.body} opacity="0.3" />
          {/* Dewdrop dots on petals */}
          <circle cx="18" cy="17" r="0.7" fill={BOT.body} opacity="0.35" />
          <circle cx="22" cy="19" r="0.5" fill={BOT.body} opacity="0.3" />
          <circle cx="48" cy="5" r="0.7" fill={BOT.body} opacity="0.35" />
          <circle cx="53" cy="6" r="0.5" fill={BOT.body} opacity="0.3" />
          <circle cx="78" cy="17" r="0.7" fill={BOT.body} opacity="0.35" />
          <circle cx="82" cy="19" r="0.5" fill={BOT.body} opacity="0.3" />
          <circle cx="35" cy="9" r="0.6" fill={BOT.body} opacity="0.3" />
          <circle cx="65" cy="9" r="0.6" fill={BOT.body} opacity="0.3" />
          {/* Pollen dots floating */}
          <circle cx="30" cy="4" r="0.5" fill={theme.accent} opacity="0.35">
            <animate attributeName="cy" values="4;1;4" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0.15;0.35" dur="3.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="44" cy="2" r="0.4" fill={theme.accent} opacity="0.3">
            <animate attributeName="cy" values="2;-1;2" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="56" cy="3" r="0.4" fill={theme.accent} opacity="0.3">
            <animate attributeName="cy" values="3;0;3" dur="3.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="70" cy="4" r="0.5" fill={theme.accent} opacity="0.35">
            <animate attributeName="cy" values="4;1;4" dur="3.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0.15;0.35" dur="3.8s" repeatCount="indefinite" />
          </circle>
          {/* Butterfly 1 — near left flowers */}
          <g transform="translate(8, 12)">
            <animateTransform attributeName="transform" type="translate" values="8 12;10 8;8 12" dur="4s" repeatCount="indefinite" />
            <path d="M0 0 Q-3 -3 -2 -5 Q0 -4 0 0 Z" fill={theme.accent} opacity="0.6" />
            <path d="M0 0 Q3 -3 2 -5 Q0 -4 0 0 Z" fill={theme.accent} opacity="0.6" />
            <path d="M0 0 Q-2 2 -1.5 4 Q0 3 0 0 Z" fill={theme.accent} opacity="0.5" />
            <path d="M0 0 Q2 2 1.5 4 Q0 3 0 0 Z" fill={theme.accent} opacity="0.5" />
            <line x1="0" y1="-1" x2="0" y2="1" stroke={theme.accent} strokeWidth="0.3" />
            <line x1="0" y1="-1" x2="-1" y2="-2.5" stroke={theme.accent} strokeWidth="0.2" />
            <line x1="0" y1="-1" x2="1" y2="-2.5" stroke={theme.accent} strokeWidth="0.2" />
          </g>
          {/* Butterfly 2 — near right flowers */}
          <g transform="translate(92, 14)">
            <animateTransform attributeName="transform" type="translate" values="92 14;90 10;92 14" dur="3.6s" repeatCount="indefinite" />
            <path d="M0 0 Q-3 -2.5 -1.5 -4.5 Q0 -3.5 0 0 Z" fill={theme.accent} opacity="0.55" />
            <path d="M0 0 Q3 -2.5 1.5 -4.5 Q0 -3.5 0 0 Z" fill={theme.accent} opacity="0.55" />
            <path d="M0 0 Q-1.8 1.8 -1 3.5 Q0 2.5 0 0 Z" fill={theme.accent} opacity="0.45" />
            <path d="M0 0 Q1.8 1.8 1 3.5 Q0 2.5 0 0 Z" fill={theme.accent} opacity="0.45" />
            <line x1="0" y1="-0.5" x2="0" y2="0.5" stroke={theme.accent} strokeWidth="0.3" />
            <line x1="0" y1="-0.5" x2="-0.8" y2="-2" stroke={theme.accent} strokeWidth="0.2" />
            <line x1="0" y1="-0.5" x2="0.8" y2="-2" stroke={theme.accent} strokeWidth="0.2" />
          </g>
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
          <path d="M4 33 Q10 4 50 -4 Q90 4 96 33 Z" fill={theme.accent} />
          {/* Ridge plates on dome — thicker, more visible */}
          <path d="M50 -4 L50 33" stroke={BOT.body} strokeWidth="0.8" opacity="0.45" />
          <path d="M30 8 L22 33" stroke={BOT.body} strokeWidth="0.7" opacity="0.4" />
          <path d="M70 8 L78 33" stroke={BOT.body} strokeWidth="0.7" opacity="0.4" />
          <path d="M40 2 L34 33" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          <path d="M60 2 L66 33" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          {/* Dome edge highlight */}
          <path d="M20 18 Q50 8 80 18" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          {/* Maedate crest — taller, more ornate with side wings */}
          <path d="M36 4 L50 -18 L64 4 L58 2 L50 -10 L42 2 Z" fill={theme.accent} />
          <path d="M30 8 L42 -4 L44 4" fill={theme.accent} />
          <path d="M70 8 L58 -4 L56 4" fill={theme.accent} />
          <circle cx="50" cy="-18" r="3.5" fill={theme.accent} />
          <circle cx="50" cy="-18" r="1.5" fill={BOT.body} opacity="0.5" />
          <circle cx="50" cy="-18" r="0.5" fill={BOT.body} opacity="0.35" />
          {/* Crest edge detail */}
          <path d="M44 -2 L50 -14" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
          <path d="M56 -2 L50 -14" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
          {/* Brow guard — thicker decorative band */}
          <rect x="2" y="29" width="96" height="7" rx="2" fill={theme.accent} />
          <path d="M8 32 L92 32" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          <path d="M8 34 L92 34" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          {/* Center mon crest — larger with kanji-style mark */}
          <circle cx="50" cy="33" r="5" fill={theme.accent} />
          <path d="M47 31 L50 28 L53 31 L50 36 Z" fill={BOT.body} opacity="0.5" />
          <path d="M49 32 L51 32" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          {/* Rivets — more of them */}
          <circle cx="16" cy="33" r="1.5" fill={theme.accent} />
          <circle cx="16" cy="33" r="0.6" fill={BOT.body} opacity="0.5" />
          <circle cx="30" cy="33" r="1.2" fill={theme.accent} />
          <circle cx="30" cy="33" r="0.5" fill={BOT.body} opacity="0.4" />
          <circle cx="70" cy="33" r="1.2" fill={theme.accent} />
          <circle cx="70" cy="33" r="0.5" fill={BOT.body} opacity="0.4" />
          <circle cx="84" cy="33" r="1.5" fill={theme.accent} />
          <circle cx="84" cy="33" r="0.6" fill={BOT.body} opacity="0.5" />
          {/* Shikoro — 3 layered neck guard flaps each side */}
          <path d="M4 36 L-2 46 L14 46 L18 36 Z" fill={theme.accent} />
          <path d="M0 44 L-4 52 L12 52 L14 44 Z" fill={theme.accent} />
          <path d="M-2 50 L-6 58 L10 58 L12 50 Z" fill={theme.accent} />
          <path d="M82 36 L86 46 L102 46 L96 36 Z" fill={theme.accent} />
          <path d="M86 44 L90 52 L104 52 L100 44 Z" fill={theme.accent} />
          <path d="M88 50 L92 58 L106 58 L102 50 Z" fill={theme.accent} />
          {/* Shikoro plate lines */}
          <path d="M2 44 L12 44" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          <path d="M0 50 L10 50" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          <path d="M88 44 L98 44" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" />
          <path d="M90 50 L100 50" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          {/* Face guard (menpo) across lower face */}
          <path d="M22 64 Q26 60 36 62 Q44 60 50 62 Q56 60 64 62 Q74 60 78 64 L80 72 Q74 80 50 84 Q26 80 20 72 Z" fill={theme.accent} />
          {/* Menpo breathing holes */}
          <circle cx="38" cy="68" r="1.2" fill={BOT.visor} opacity="0.5" />
          <circle cx="42" cy="70" r="1" fill={BOT.visor} opacity="0.5" />
          <circle cx="46" cy="68" r="1.2" fill={BOT.visor} opacity="0.5" />
          <circle cx="50" cy="70" r="1" fill={BOT.visor} opacity="0.5" />
          <circle cx="54" cy="68" r="1.2" fill={BOT.visor} opacity="0.5" />
          <circle cx="58" cy="70" r="1" fill={BOT.visor} opacity="0.5" />
          <circle cx="62" cy="68" r="1.2" fill={BOT.visor} opacity="0.5" />
          {/* Menpo chin ridge */}
          <path d="M30 74 Q40 78 50 80 Q60 78 70 74" stroke={BOT.body} strokeWidth="0.6" opacity="0.35" fill="none" />
          <path d="M34 76 Q44 80 50 82 Q56 80 66 76" stroke={BOT.body} strokeWidth="0.4" opacity="0.25" fill="none" />
          {/* Menpo cheek plates edge detail */}
          <path d="M24 64 Q28 66 34 64" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          <path d="M66 64 Q72 66 76 64" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          {/* Cord tassels hanging from helmet sides */}
          <path d="M-4 56 L-6 66 L-2 66 L-4 56 Z" fill={theme.accent} />
          <circle cx="-4" cy="68" r="1.5" fill={theme.accent} />
          <circle cx="-4" cy="68" r="0.6" fill={BOT.body} opacity="0.4" />
          <path d="M-6 66 L-8 72" stroke={theme.accent} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M-2 66 L0 72" stroke={theme.accent} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M104 56 L106 66 L102 66 L104 56 Z" fill={theme.accent} />
          <circle cx="104" cy="68" r="1.5" fill={theme.accent} />
          <circle cx="104" cy="68" r="0.6" fill={BOT.body} opacity="0.4" />
          <path d="M106 66 L108 72" stroke={theme.accent} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M102 66 L100 72" stroke={theme.accent} strokeWidth="0.8" strokeLinecap="round" />
          {/* More ornamental rivets on brow guard */}
          <circle cx="22" cy="33" r="1" fill={theme.accent} />
          <circle cx="22" cy="33" r="0.4" fill={BOT.body} opacity="0.4" />
          <circle cx="38" cy="33" r="1" fill={theme.accent} />
          <circle cx="38" cy="33" r="0.4" fill={BOT.body} opacity="0.4" />
          <circle cx="62" cy="33" r="1" fill={theme.accent} />
          <circle cx="62" cy="33" r="0.4" fill={BOT.body} opacity="0.4" />
          <circle cx="78" cy="33" r="1" fill={theme.accent} />
          <circle cx="78" cy="33" r="0.4" fill={BOT.body} opacity="0.4" />
          {/* Plate edge gilding lines on dome */}
          <path d="M10 28 Q50 22 90 28" stroke={BOT.body} strokeWidth="0.35" opacity="0.25" fill="none" />
          <path d="M15 24 Q50 18 85 24" stroke={BOT.body} strokeWidth="0.3" opacity="0.2" fill="none" />
          {/* War fan (tessen) tucked in left side */}
          <g transform="translate(-10, 70) rotate(-15)">
            <path d="M0 0 L-3 -12 Q0 -14 3 -12 Z" fill={theme.accent} />
            <path d="M0 0 L-6 -10 Q0 -14 0 -12 Z" fill={theme.accent} opacity="0.8" />
            <path d="M0 0 L6 -10 Q0 -14 0 -12 Z" fill={theme.accent} opacity="0.8" />
            <path d="M0 -2 L0 -12" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" />
            <path d="M0 -2 L-3 -11" stroke={BOT.body} strokeWidth="0.25" opacity="0.3" />
            <path d="M0 -2 L3 -11" stroke={BOT.body} strokeWidth="0.25" opacity="0.3" />
            <circle cx="0" cy="0" r="1" fill={theme.accent} />
            <circle cx="0" cy="0" r="0.4" fill={BOT.body} opacity="0.4" />
          </g>
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
          <path d="M6 50 Q2 14 50 -8 Q98 14 94 50 Z" fill={theme.accent} />
          {/* Hood side drapes — longer, flowing */}
          <path d="M6 50 Q4 62 2 74 L14 72 Q14 58 14 50 Z" fill={theme.accent} />
          <path d="M94 50 Q96 62 98 74 L86 72 Q86 58 86 50 Z" fill={theme.accent} />
          {/* Hood fabric fold lines — more, thicker */}
          <path d="M28 8 Q38 20 36 42" stroke={BOT.body} strokeWidth="0.7" opacity="0.38" fill="none" />
          <path d="M72 8 Q62 20 64 42" stroke={BOT.body} strokeWidth="0.7" opacity="0.38" fill="none" />
          <path d="M50 -8 Q48 10 46 34" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" fill="none" />
          <path d="M38 4 Q42 16 40 36" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          <path d="M62 4 Q58 16 60 36" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          {/* Rune marks — more, with mystic symbols */}
          <path d="M22 26 L24 22 L26 26 L24 30 Z" fill={BOT.body} opacity="0.4" />
          <path d="M20 20 L22 18 L24 20" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" fill="none" />
          <path d="M74 26 L76 22 L78 26 L76 30 Z" fill={BOT.body} opacity="0.4" />
          <path d="M76 20 L78 18 L80 20" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" fill="none" />
          {/* Third eye rune on forehead */}
          <path d="M46 12 L50 8 L54 12 L50 16 Z" fill={BOT.body} opacity="0.3" />
          <circle cx="50" cy="12" r="1.5" fill={BOT.body} opacity="0.35" />
          {/* Hood trim edge — double line */}
          <path d="M6 50 Q50 42 94 50" stroke={BOT.body} strokeWidth="0.8" opacity="0.35" fill="none" />
          <path d="M8 48 Q50 40 92 48" stroke={BOT.body} strokeWidth="0.4" opacity="0.25" fill="none" />
          {/* Ornate clasp — larger, more detailed */}
          <path d="M44 78 L50 70 L56 78 L50 86 Z" fill={theme.accent} />
          <path d="M46 78 L50 72 L54 78 L50 84 Z" fill={BOT.body} opacity="0.35" />
          <circle cx="50" cy="78" r="1.5" fill={BOT.body} opacity="0.5" />
          {/* Side tassels — longer with beads */}
          <path d="M14 72 L11 82 L17 82 L14 72 Z" fill={theme.accent} />
          <circle cx="14" cy="84" r="1.5" fill={theme.accent} />
          <circle cx="14" cy="84" r="0.5" fill={BOT.body} opacity="0.5" />
          <path d="M86 72 L83 82 L89 82 L86 72 Z" fill={theme.accent} />
          <circle cx="86" cy="84" r="1.5" fill={theme.accent} />
          <circle cx="86" cy="84" r="0.5" fill={BOT.body} opacity="0.5" />
          {/* Drape edge fraying */}
          <path d="M4 72 L2 76" stroke={theme.accent} strokeWidth="1" strokeLinecap="round" />
          <path d="M8 74 L6 78" stroke={theme.accent} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M96 72 L98 76" stroke={theme.accent} strokeWidth="1" strokeLinecap="round" />
          <path d="M92 74 L94 78" stroke={theme.accent} strokeWidth="0.8" strokeLinecap="round" />
          {/* More fraying threads */}
          <path d="M6 73 L3 78" stroke={theme.accent} strokeWidth="0.6" strokeLinecap="round" />
          <path d="M10 74 L9 79" stroke={theme.accent} strokeWidth="0.5" strokeLinecap="round" />
          <path d="M2 74 L0 77" stroke={theme.accent} strokeWidth="0.5" strokeLinecap="round" />
          <path d="M94 73 L97 78" stroke={theme.accent} strokeWidth="0.6" strokeLinecap="round" />
          <path d="M90 74 L91 79" stroke={theme.accent} strokeWidth="0.5" strokeLinecap="round" />
          <path d="M98 74 L100 77" stroke={theme.accent} strokeWidth="0.5" strokeLinecap="round" />
          {/* Glowing eye marking under hood — third eye area */}
          <path d="M44 42 Q50 38 56 42 Q50 46 44 42 Z" fill={theme.accent} opacity="0.3" />
          <circle cx="50" cy="42" r="2" fill={BOT.body} opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="50" cy="42" r="0.8" fill={BOT.body} opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* More rune symbols — scattered across hood */}
          {/* Rune: arrow/tiwaz left side */}
          <path d="M16 36 L18 32 L20 36" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" fill="none" />
          <line x1="18" y1="32" x2="18" y2="40" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
          {/* Rune: algiz right side */}
          <line x1="80" y1="40" x2="80" y2="32" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
          <path d="M78 34 L80 32 L82 34" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" fill="none" />
          {/* Rune: ingwaz diamond on left */}
          <path d="M12 38 L14 35 L16 38 L14 41 Z" fill="none" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          {/* Rune: sowilo zigzag upper right */}
          <path d="M70 14 L74 12 L70 18 L74 16" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          {/* Rune: kenaz on left mid */}
          <path d="M26 38 L28 34 L30 38" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" fill="none" />
          <path d="M26 38 L28 42" stroke={BOT.body} strokeWidth="0.35" opacity="0.3" />
          {/* Chain with pendant hanging from clasp */}
          <path d="M50 86 L50 92" stroke={theme.accent} strokeWidth="1" strokeLinecap="round" />
          <circle cx="50" cy="89" r="0.8" fill={theme.accent} />
          <path d="M47 94 L50 90 L53 94 L50 98 Z" fill={theme.accent} />
          <circle cx="50" cy="94" r="1.2" fill={BOT.body} opacity="0.35" />
          <circle cx="50" cy="94" r="0.5" fill={BOT.body} opacity="0.5" />
          {/* Hood inner lining edge — darker visible rim */}
          <path d="M10 48 Q50 40 90 48" stroke={theme.accent} strokeWidth="1.2" opacity="0.6" fill="none" />
          <path d="M12 46 Q50 38 88 46" stroke={BOT.body} strokeWidth="0.5" opacity="0.2" fill="none" />
          {/* Mystical circle pattern on forehead area */}
          <circle cx="50" cy="12" r="6" fill="none" stroke={BOT.body} strokeWidth="0.4" opacity="0.22" />
          <circle cx="50" cy="12" r="8.5" fill="none" stroke={BOT.body} strokeWidth="0.3" opacity="0.18" strokeDasharray="1.2 2" />
          {/* Small crossmarks at circle cardinal points */}
          <line x1="50" y1="3" x2="50" y2="5" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <line x1="49" y1="4" x2="51" y2="4" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <line x1="41" y1="12" x2="43" y2="12" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <line x1="42" y1="11" x2="42" y2="13" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <line x1="57" y1="12" x2="59" y2="12" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <line x1="58" y1="11" x2="58" y2="13" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
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
          <line x1="18" y1="14" x2="30" y2="20" stroke={theme.accent} strokeWidth="0.3" opacity="0.3" />
          <line x1="82" y1="18" x2="76" y2="8" stroke={theme.accent} strokeWidth="0.3" opacity="0.3" />
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
          <path d="M8 32 L16 14 L24 26 L32 10 L40 24 L50 2 L60 24 L68 10 L76 26 L84 14 L92 32 Z" fill={theme.accent} />
          {/* Crown base band — thicker */}
          <rect x="6" y="28" width="88" height="6" rx="2" fill={theme.accent} />
          {/* Band edge highlights */}
          <path d="M10 30 L90 30" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          <path d="M10 32 L90 32" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          {/* Crown point jewels — larger with inner glow */}
          <circle cx="16" cy="14" r="2" fill={BOT.body} opacity="0.5" />
          <circle cx="16" cy="14" r="0.8" fill={BOT.body} opacity="0.35" />
          <circle cx="32" cy="10" r="2" fill={BOT.body} opacity="0.5" />
          <circle cx="32" cy="10" r="0.8" fill={BOT.body} opacity="0.35" />
          <circle cx="68" cy="10" r="2" fill={BOT.body} opacity="0.5" />
          <circle cx="68" cy="10" r="0.8" fill={BOT.body} opacity="0.35" />
          <circle cx="84" cy="14" r="2" fill={BOT.body} opacity="0.5" />
          <circle cx="84" cy="14" r="0.8" fill={BOT.body} opacity="0.35" />
          {/* Crown point edge lines */}
          <path d="M16 16 L24 26" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <path d="M84 16 L76 26" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          {/* Central crystal — taller, more facets */}
          <path d="M40 28 L50 0 L60 28 L50 40 Z" fill={theme.accent} />
          {/* Crystal facet lines — more detail */}
          <path d="M45 14 L50 0 L55 14" stroke={BOT.body} strokeWidth="0.6" opacity="0.45" fill="none" />
          <path d="M43 22 L50 10 L57 22" stroke={BOT.body} strokeWidth="0.5" opacity="0.38" fill="none" />
          <path d="M42 28 L50 18 L58 28" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          <path d="M50 0 L50 40" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
          <path d="M44 28 L50 6" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <path d="M56 28 L50 6" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          {/* Crystal highlight */}
          <path d="M47 8 L50 2 L51 10" stroke={BOT.body} strokeWidth="0.5" opacity="0.5" fill="none" />
          {/* Side gems — larger diamonds */}
          <path d="M16 28 L18 23 L20 28 L18 33 Z" fill={theme.accent} />
          <circle cx="18" cy="28" r="1" fill={BOT.body} opacity="0.45" />
          <path d="M80 28 L82 23 L84 28 L82 33 Z" fill={theme.accent} />
          <circle cx="82" cy="28" r="1" fill={BOT.body} opacity="0.45" />
          {/* Additional mid-gems on band */}
          <path d="M34 28 L35 25 L36 28 L35 31 Z" fill={theme.accent} />
          <circle cx="35" cy="28" r="0.5" fill={BOT.body} opacity="0.4" />
          <path d="M64 28 L65 25 L66 28 L65 31 Z" fill={theme.accent} />
          <circle cx="65" cy="28" r="0.5" fill={BOT.body} opacity="0.4" />
          {/* Filigree scrollwork on band */}
          <path d="M22 30 Q26 28 30 30 Q26 32 22 30" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" fill="none" />
          <path d="M70 30 Q74 28 78 30 Q74 32 70 30" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" fill="none" />
          {/* More filigree scrollwork patterns */}
          <path d="M38 30 Q42 28 46 30 Q42 32 38 30" stroke={BOT.body} strokeWidth="0.3" opacity="0.28" fill="none" />
          <path d="M54 30 Q58 28 62 30 Q58 32 54 30" stroke={BOT.body} strokeWidth="0.3" opacity="0.28" fill="none" />
          <path d="M12 30 Q15 27 18 30 Q15 33 12 30" stroke={BOT.body} strokeWidth="0.25" opacity="0.25" fill="none" />
          <path d="M82 30 Q85 27 88 30 Q85 33 82 30" stroke={BOT.body} strokeWidth="0.25" opacity="0.25" fill="none" />
          {/* Chain links connecting side gems to crown */}
          {/* Left chain: side gem to crown point */}
          <ellipse cx="16" cy="20" rx="1.5" ry="1" fill="none" stroke={theme.accent} strokeWidth="0.6" />
          <ellipse cx="16" cy="17" rx="1" ry="1.5" fill="none" stroke={theme.accent} strokeWidth="0.6" />
          <ellipse cx="17" cy="14.5" rx="1.5" ry="1" fill="none" stroke={theme.accent} strokeWidth="0.6" />
          {/* Right chain: side gem to crown point */}
          <ellipse cx="84" cy="20" rx="1.5" ry="1" fill="none" stroke={theme.accent} strokeWidth="0.6" />
          <ellipse cx="84" cy="17" rx="1" ry="1.5" fill="none" stroke={theme.accent} strokeWidth="0.6" />
          <ellipse cx="83" cy="14.5" rx="1.5" ry="1" fill="none" stroke={theme.accent} strokeWidth="0.6" />
          {/* Engraved symbols on crown band */}
          {/* Star/asterisk symbol */}
          <line x1="26" y1="29" x2="26" y2="33" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="24" y1="31" x2="28" y2="31" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="24.5" y1="29.5" x2="27.5" y2="32.5" stroke={BOT.body} strokeWidth="0.25" opacity="0.25" />
          <line x1="27.5" y1="29.5" x2="24.5" y2="32.5" stroke={BOT.body} strokeWidth="0.25" opacity="0.25" />
          {/* Circle-dot symbol */}
          <circle cx="48" cy="31" r="1.5" fill="none" stroke={BOT.body} strokeWidth="0.3" opacity="0.28" />
          <circle cx="48" cy="31" r="0.3" fill={BOT.body} opacity="0.3" />
          {/* Triangle symbol */}
          <path d="M52 32.5 L53.5 29.5 L55 32.5 Z" fill="none" stroke={BOT.body} strokeWidth="0.3" opacity="0.28" />
          {/* Moon crescent symbol */}
          <path d="M74 29.5 Q76 31 74 32.5 Q75.5 31 74 29.5" stroke={BOT.body} strokeWidth="0.3" opacity="0.28" fill="none" />
          {/* Gem facet highlights — light glints on all gems */}
          <path d="M17 26 L18 24 L19 26" stroke={BOT.body} strokeWidth="0.4" opacity="0.4" fill="none" />
          <path d="M81 26 L82 24 L83 26" stroke={BOT.body} strokeWidth="0.4" opacity="0.4" fill="none" />
          <path d="M34 26 L35 24.5 L36 26" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" fill="none" />
          <path d="M64 26 L65 24.5 L66 26" stroke={BOT.body} strokeWidth="0.3" opacity="0.35" fill="none" />
          {/* Crown velvet lining visible at edges */}
          <path d="M10 33 Q20 35 30 34 Q40 35 50 34 Q60 35 70 34 Q80 35 90 33" stroke={BOT.body} strokeWidth="0.6" opacity="0.15" fill="none" />
          <rect x="8" y="33" width="84" height="2" rx="1" fill={BOT.body} opacity="0.08" />
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
          {/* Small floating sparkle dots */}
          <circle cx="30" cy="8" r="0.6" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.45;0" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="cy" values="8;5;8" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="70" cy="6" r="0.5" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.4;0" dur="3.2s" repeatCount="indefinite" />
            <animate attributeName="cy" values="6;3;6" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="42" cy="4" r="0.4" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.35;0" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="cy" values="4;1;4" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="58" cy="5" r="0.5" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.38;0" dur="3.6s" repeatCount="indefinite" />
            <animate attributeName="cy" values="5;2;5" dur="3.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="15" cy="20" r="0.4" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.3;0" dur="4.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="85" cy="18" r="0.4" fill={theme.accent} opacity="0">
            <animate attributeName="opacity" values="0;0.3;0" dur="3.8s" repeatCount="indefinite" />
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
          <path d="M2 52 Q0 14 50 2 Q100 14 98 52 Z" fill={theme.accent} />
          {/* Band padding ridges */}
          <path d="M18 16 Q50 8 82 16" stroke={BOT.body} strokeWidth="0.6" opacity="0.38" fill="none" />
          <path d="M14 22 Q50 14 86 22" stroke={BOT.body} strokeWidth="0.5" opacity="0.35" fill="none" />
          <path d="M12 28 Q50 20 88 28" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" fill="none" />
          {/* Top-of-head padding cushion */}
          <rect x="36" y="6" width="28" height="6" rx="3" fill={theme.accent} />
          <path d="M40 9 L60 9" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          {/* Left ear cup — larger, more detailed */}
          <rect x="-4" y="40" width="18" height="24" rx="6" fill={theme.accent} />
          <rect x="-2" y="42" width="14" height="20" rx="5" fill={theme.accent} />
          <rect x="0" y="44" width="10" height="16" rx="4" fill={theme.accent} />
          {/* Speaker grille lines */}
          <line x1="2" y1="47" x2="8" y2="47" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          <line x1="2" y1="50" x2="8" y2="50" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          <line x1="2" y1="53" x2="8" y2="53" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          <line x1="2" y1="56" x2="8" y2="56" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          {/* Left cup brand circle */}
          <circle cx="5" cy="52" r="3" fill="none" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          {/* Right ear cup — larger, more detailed */}
          <rect x="86" y="40" width="18" height="24" rx="6" fill={theme.accent} />
          <rect x="88" y="42" width="14" height="20" rx="5" fill={theme.accent} />
          <rect x="90" y="44" width="10" height="16" rx="4" fill={theme.accent} />
          {/* Speaker grille lines */}
          <line x1="92" y1="47" x2="98" y2="47" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          <line x1="92" y1="50" x2="98" y2="50" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          <line x1="92" y1="53" x2="98" y2="53" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          <line x1="92" y1="56" x2="98" y2="56" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
          {/* Right cup brand circle */}
          <circle cx="95" cy="52" r="3" fill="none" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          {/* Mic boom arm — thicker, more joints */}
          <path d="M-2 62 Q2 68 6 72 L10 76 L14 78" fill="none" stroke={theme.accent} strokeWidth="3.5" strokeLinecap="round" />
          {/* Boom joints */}
          <circle cx="2" cy="65" r="2" fill={theme.accent} />
          <circle cx="2" cy="65" r="0.8" fill={BOT.body} opacity="0.5" />
          <circle cx="8" cy="74" r="1.5" fill={theme.accent} />
          <circle cx="8" cy="74" r="0.6" fill={BOT.body} opacity="0.4" />
          {/* Mic capsule — larger with windscreen texture */}
          <rect x="11" y="74" width="10" height="8" rx="4" fill={theme.accent} />
          <line x1="13" y1="76" x2="19" y2="76" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
          <line x1="13" y1="78" x2="19" y2="78" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
          <line x1="13" y1="80" x2="19" y2="80" stroke={BOT.body} strokeWidth="0.4" opacity="0.35" />
          {/* Tactical antennas — two on right ear */}
          <line x1="96" y1="40" x2="98" y2="26" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" />
          <circle cx="98" cy="26" r="1.8" fill={theme.accent} />
          <circle cx="98" cy="26" r="0.7" fill={BOT.body} opacity="0.25" />
          <line x1="92" y1="40" x2="90" y2="30" stroke={theme.accent} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="90" cy="30" r="1.2" fill={theme.accent} />
          <circle cx="90" cy="30" r="0.5" fill={BOT.body} opacity="0.5" />
          {/* Status LEDs — green and red */}
          <circle cx="-1" cy="44" r="1.2" fill={theme.accent} />
          <circle cx="-1" cy="44" r="0.5" fill={BOT.body} opacity="0.35" />
          <circle cx="-1" cy="48" r="1" fill={theme.accent} />
          <circle cx="-1" cy="48" r="0.4" fill={BOT.body} opacity="0.5" />
          {/* Cable/wire from left ear cup to headband */}
          <path d="M-2 42 Q-6 36 -4 28 Q-2 20 8 16" stroke={theme.accent} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M-2 42 Q-6 36 -4 28 Q-2 20 8 16" stroke={BOT.body} strokeWidth="0.4" opacity="0.2" fill="none" />
          {/* Cable clip on band */}
          <rect x="6" y="14" width="4" height="3" rx="1" fill={theme.accent} />
          <rect x="7" y="15" width="2" height="1" rx="0.5" fill={BOT.body} opacity="0.25" />
          {/* LED status strip on headband */}
          <rect x="28" y="10" width="44" height="2" rx="1" fill={theme.accent} opacity="0.7" />
          <circle cx="34" cy="11" r="0.8" fill={BOT.body} opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="40" cy="11" r="0.8" fill={BOT.body} opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="46" cy="11" r="0.8" fill={BOT.body} opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="52" cy="11" r="0.8" fill={BOT.body} opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="58" cy="11" r="0.8" fill={BOT.body} opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="64" cy="11" r="0.8" fill={BOT.body} opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="1.7s" repeatCount="indefinite" />
          </circle>
          {/* More mic windscreen texture */}
          <line x1="12" y1="75" x2="20" y2="75" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="12" y1="77" x2="20" y2="77" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="12" y1="79" x2="20" y2="79" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="12" y1="81" x2="20" y2="81" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          {/* Windscreen dot texture */}
          <circle cx="14" cy="76.5" r="0.3" fill={BOT.body} opacity="0.25" />
          <circle cx="16" cy="78.5" r="0.3" fill={BOT.body} opacity="0.25" />
          <circle cx="18" cy="76.5" r="0.3" fill={BOT.body} opacity="0.25" />
          <circle cx="15" cy="80" r="0.3" fill={BOT.body} opacity="0.25" />
          <circle cx="17" cy="80" r="0.3" fill={BOT.body} opacity="0.25" />
          {/* Tactical HUD monocle over right eye */}
          <rect x="56" y="38" width="22" height="16" rx="3" fill={theme.accent} opacity="0.35" />
          <rect x="57" y="39" width="20" height="14" rx="2.5" fill="none" stroke={theme.accent} strokeWidth="0.8" />
          {/* HUD display lines */}
          <line x1="60" y1="42" x2="72" y2="42" stroke={BOT.body} strokeWidth="0.3" opacity="0.2" />
          <line x1="60" y1="45" x2="68" y2="45" stroke={BOT.body} strokeWidth="0.3" opacity="0.2" />
          <line x1="60" y1="48" x2="74" y2="48" stroke={BOT.body} strokeWidth="0.3" opacity="0.2" />
          {/* HUD crosshair/reticle */}
          <circle cx="67" cy="45" r="3" fill="none" stroke={BOT.body} strokeWidth="0.25" opacity="0.18" />
          <line x1="67" y1="42" x2="67" y2="43" stroke={BOT.body} strokeWidth="0.25" opacity="0.18" />
          <line x1="67" y1="47" x2="67" y2="48" stroke={BOT.body} strokeWidth="0.25" opacity="0.18" />
          <line x1="64" y1="45" x2="65" y2="45" stroke={BOT.body} strokeWidth="0.25" opacity="0.18" />
          <line x1="69" y1="45" x2="70" y2="45" stroke={BOT.body} strokeWidth="0.25" opacity="0.18" />
          {/* Monocle arm connecting to headband */}
          <path d="M76 38 Q82 34 86 40" stroke={theme.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Serial number markings on left ear cup */}
          <line x1="0" y1="58" x2="2" y2="58" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <line x1="3" y1="58" x2="4" y2="58" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <line x1="5" y1="58" x2="7" y2="58" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          <line x1="8" y1="58" x2="9" y2="58" stroke={BOT.body} strokeWidth="0.3" opacity="0.25" />
          {/* Volume dial on right ear cup */}
          <circle cx="95" cy="46" r="3.5" fill={theme.accent} />
          <circle cx="95" cy="46" r="2.5" fill="none" stroke={BOT.body} strokeWidth="0.4" opacity="0.3" />
          <circle cx="95" cy="46" r="1" fill={BOT.body} opacity="0.25" />
          {/* Dial tick marks */}
          <line x1="95" y1="42.8" x2="95" y2="43.5" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="97.7" y1="44.3" x2="97.2" y2="44.8" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="98.5" y1="46" x2="97.8" y2="46" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="97.7" y1="47.7" x2="97.2" y2="47.2" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="95" y1="49.2" x2="95" y2="48.5" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          <line x1="92.3" y1="47.7" x2="92.8" y2="47.2" stroke={BOT.body} strokeWidth="0.3" opacity="0.3" />
          {/* Dial position indicator */}
          <line x1="95" y1="46" x2="97" y2="44.5" stroke={BOT.body} strokeWidth="0.5" opacity="0.4" />
        </>
      }
    />
  )
}

// ── Plain bot (no accessories) ────────────────────────────

function PlainOutfit({ theme, nudging, emotion }: { theme: MindsetTheme; nudging?: boolean; emotion?: CoachEmotion }) {
  return <OutfitLayout accent={theme.accent} nudging={nudging} emotion={emotion} />
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

export function CoachAvatar({ mindsetId, size = 'md', className = '', nudging, emotion, plain }: CoachAvatarProps) {
  const reactId = useId()
  const [tapped, setTapped] = useState(false)
  const mid = mindsetId || 'stoic'
  const theme = THEMES[mid] || THEMES.stoic
  const Outfit = plain ? PlainOutfit : (OUTFIT_MAP[mid] || SageOutfit)
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
