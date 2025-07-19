# 🎨 UI/UX Design - VoxFlow Interface

## Design Philosophy

### Core Principles
- **Minimalist**: Focus on content, not chrome
- **Responsive**: Fluid animations and instant feedback
- **Accessible**: WCAG 2.1 AA compliant
- **Delightful**: Micro-interactions that feel natural

### Design Language
- **Apple-inspired** aesthetics
- **Glassmorphism** for depth
- **Smooth gradients** for visual interest
- **Semantic animations** that communicate state

## Color System

### Light Theme
```css
--primary: #007AFF;        /* Apple Blue */
--secondary: #5856D6;      /* Purple */
--accent: #FF3B30;         /* Red for recording */
--background: #FFFFFF;
--surface: #F2F2F7;
--text-primary: #000000;
--text-secondary: #3C3C43;
--border: #C6C6C8;
```

### Dark Theme
```css
--primary: #0A84FF;
--secondary: #5E5CE6;
--accent: #FF453A;
--background: #000000;
--surface: #1C1C1E;
--text-primary: #FFFFFF;
--text-secondary: #98989D;
--border: #38383A;
```

### Semantic Colors
```css
--success: #34C759;
--warning: #FF9500;
--error: #FF3B30;
--info: #007AFF;
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 
             'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
```

### Type Scale
- **Display**: 56px / 64px line-height
- **Headline**: 34px / 41px
- **Title**: 28px / 34px
- **Body**: 17px / 22px
- **Caption**: 13px / 18px

## Component Library

### 1. Recording Button
```
States:
- Idle: Subtle pulse animation
- Recording: Red with expanding rings
- Processing: Loading spinner
- Complete: Success checkmark

Interactions:
- Hover: Scale 1.05 with shadow
- Active: Scale 0.95
- Long press: Cancel recording
```

### 2. Waveform Visualizer
```
Features:
- Real-time amplitude display
- Gradient fill (primary to secondary)
- Smooth transitions
- Zoom and pan controls
- Time markers

Colors:
- Active: Primary gradient
- Inactive: Gray scale
- Highlight: Accent color
```

### 3. Transcription View
```
Layout:
- Split view option
- Confidence highlighting
- Speaker labels (if available)
- Timestamp toggles
- Search highlighting

Interactions:
- Click to edit
- Select to export
- Hover for options
```

## Screen Designs

### 1. Home Screen
```
┌─────────────────────────────────────┐
│  VoxFlow        [Light/Dark] [Menu] │
├─────────────────────────────────────┤
│                                     │
│        🎙️ [Record Button]           │
│         "Click to start"            │
│                                     │
│  ─────── or drop files here ─────── │
│                                     │
│  Recent Transcriptions:             │
│  ┌─────────────────────────────┐   │
│  │ Meeting Notes - 2 hours ago  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Interview - Yesterday        │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 2. Recording Screen
```
┌─────────────────────────────────────┐
│  ← Back          00:42         ⚙️   │
├─────────────────────────────────────┤
│                                     │
│     [Live Waveform Animation]       │
│                                     │
├─────────────────────────────────────┤
│  Live Transcription:                │
│  "This is what you're saying right  │
│   now, appearing in real-time..."   │
│                                     │
│         [⏸️]     [⏹️]                │
└─────────────────────────────────────┘
```

### 3. Results Screen
```
┌─────────────────────────────────────┐
│  ← Back    Meeting Notes    [Share] │
├─────────────────────────────────────┤
│  [Compact Waveform Overview]        │
├─────────────────────────────────────┤
│  Transcription            [Edit] 📝  │
│  ┌─────────────────────────────┐   │
│  │ [00:00] Speaker 1:          │   │
│  │ Welcome everyone to today's  │   │
│  │ meeting about the new...     │   │
│  │                              │   │
│  │ [00:15] Speaker 2:          │   │
│  │ Thanks for having me...      │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Export TXT] [Export SRT] [Copy]   │
└─────────────────────────────────────┘
```

## Animations & Transitions

### 1. Page Transitions
- **Slide**: 300ms ease-out
- **Fade**: 200ms ease-in-out
- **Scale**: From 0.95 to 1

### 2. Micro-interactions
- **Button Press**: Scale + Shadow
- **Toggle**: Smooth slide with color change
- **Loading**: Skeleton screens
- **Success**: Checkmark draw animation

### 3. Recording Animations
```css
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes recording-ring {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
}
```

## Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations
- Full-screen recording mode
- Bottom sheet for options
- Swipe gestures
- Larger touch targets (44px minimum)

## Accessibility

### Keyboard Navigation
- **Tab**: Navigate between elements
- **Space**: Start/Stop recording
- **Enter**: Confirm actions
- **Escape**: Cancel/Close modals

### Screen Reader Support
- Semantic HTML
- ARIA labels
- Live regions for updates
- Focus management

### Visual Accessibility
- High contrast mode
- Focus indicators
- Color blind friendly
- Reduced motion option

## User Flow

### 1. First Time User
```
Welcome Screen → Permissions Request → Tutorial → Ready to Record
```

### 2. Recording Flow
```
Home → Click Record → Live Recording → Stop → Processing → Results
         ↓
    Drop File → Processing → Results
```

### 3. Export Flow
```
Results → Export Menu → Format Selection → Download
                     ↓
                  Share → Copy Link
```

## Loading States

### 1. Initial Load
- Logo animation
- Progress bar
- Model loading status

### 2. Processing
- Waveform skeleton
- Progress percentage
- Time estimate

### 3. Error States
- Clear error messages
- Retry options
- Fallback UI

## Icon System

Using **Lucide React** for consistency:
- `Mic` / `MicOff` - Recording states
- `Upload` - File upload
- `Download` - Export
- `Play` / `Pause` - Playback
- `Edit` - Edit mode
- `Share2` - Share options
- `Settings` - Configuration
- `Moon` / `Sun` - Theme toggle

## Toast Notifications

### Types
- **Success**: Green with checkmark
- **Error**: Red with X
- **Info**: Blue with i
- **Loading**: With spinner

### Positioning
- Top-right on desktop
- Bottom on mobile
- Stack multiple toasts

## Performance Considerations

### 1. Optimistic UI
- Immediate visual feedback
- Update with real data later
- Rollback on error

### 2. Lazy Loading
- Images and icons
- Heavy components
- Route-based splitting

### 3. Smooth Scrolling
- 60fps target
- Hardware acceleration
- Virtual scrolling for long lists

## Future UI Enhancements

### 1. Advanced Features
- Multi-speaker view
- Timeline scrubbing
- Keyword highlighting
- Search and filter

### 2. Customization
- Theme builder
- Layout options
- Hotkey configuration
- Widget mode

### 3. Collaboration
- Share with team
- Comments
- Version history
- Real-time collaboration