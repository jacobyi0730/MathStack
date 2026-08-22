# 효과음 출처와 라이선스

이 폴더의 모든 `.m4a` 파일은 **Kenney**(https://kenney.nl)가 배포하는 CC0 1.0
(퍼블릭 도메인) 사운드 팩에서 골라, 길이를 자르고 모노 AAC 64 kbps 로 다시 인코딩한 것이다.

- 라이선스: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- **저작자 표시 의무 없음.** 이 문서는 의무가 아니라 재현을 위해 남긴다.
- 상업적 이용·수정·재배포 모두 허용된다.

## 원본 대응표

| 파일 | 원본 팩 | 원본 파일 |
| --- | --- | --- |
| `hit.m4a` | Impact Sounds | `impactGeneric_light_000.ogg` |
| `hit-heavy.m4a` | Impact Sounds | `impactPunch_medium_000.ogg` |
| `enemy-death.m4a` | Sci-Fi Sounds | `explosionCrunch_000.ogg` |
| `elite-death.m4a` | Sci-Fi Sounds | `explosionCrunch_002.ogg` |
| `player-hurt.m4a` | Impact Sounds | `impactPunch_heavy_000.ogg` |
| `player-down.m4a` | Digital Audio | `lowThreeTone.ogg` |
| `crate-break.m4a` | Impact Sounds | `impactGlass_medium_000.ogg` |
| `pickup-xp.m4a` | Interface Sounds | `bong_001.ogg` |
| `pickup-item.m4a` | Interface Sounds | `confirmation_001.ogg` |
| `heal.m4a` | Digital Audio | `powerUp5.ogg` |
| `level-up.m4a` | Digital Audio | `powerUp11.ogg` |
| `boss-spawn.m4a` | Sci-Fi Sounds | `lowFrequency_explosion_001.ogg` |
| `boss-skill.m4a` | Sci-Fi Sounds | `forceField_000.ogg` |
| `boss-charge.m4a` | Sci-Fi Sounds | `laserLarge_000.ogg` |
| `boss-phase.m4a` | Digital Audio | `zapThreeToneDown.ogg` |
| `boss-death.m4a` | Sci-Fi Sounds | `explosionCrunch_004.ogg` |
| `meteor.m4a` | Sci-Fi Sounds | `lowFrequency_explosion_000.ogg` |
| `freeze.m4a` | Digital Audio | `phaserDown1.ogg` |
| `magnet.m4a` | Digital Audio | `phaserUp3.ogg` |
| `quiz-open.m4a` | Interface Sounds | `question_001.ogg` |
| `quiz-correct.m4a` | Digital Audio | `powerUp7.ogg` |
| `quiz-wrong.m4a` | Digital Audio | `lowDown.ogg` |
| `ui-click.m4a` | Interface Sounds | `click_001.ogg` |
| `victory.m4a` | Digital Audio | `threeTone1.ogg` |

## 왜 `.m4a` 인가

원본은 Ogg Vorbis 다. iOS Safari 가 Ogg 를 오래 지원하지 않았고 이 게임은 모바일에서도
돌아야 하므로, 어느 브라우저에서나 디코딩되는 AAC/MP4 로 통일했다.

## 다시 만드는 법

`tools/` 에 넣지 않았다. 빌드마다 돌 필요가 없고, Netlify 빌드에 `ffmpeg` 의존성을
들이는 것은 규칙 1(정적 배포)의 취지에 어긋난다. 음원을 바꿀 때만 손으로 돌린다.

```bash
ffmpeg -i <원본>.ogg -t <초> -ac 1 -ar 44100 \
  -af "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0,afade=t=out:st=<초-0.05>:d=0.05" \
  -c:a aac -b:a 64k -movflags +faststart public/audio/<큐>.m4a
```

큐 이름과 볼륨 정본은 [`src/audio/cues.ts`](../../src/audio/cues.ts).
