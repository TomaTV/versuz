# Versuz Manifesto — Sound Design

Compagnon audio pour la scène `manifesto` (`.ads/versuz-ads-scenes-4.jsx`).

**Le motion exporté n'a pas de son** (Playwright capture juste la vidéo). Ce
doc te donne le workflow pratique pour ajouter du son en 30-60 min sans
être ingé son, en utilisant des outils AI grand public.

---

## Plan rapide (30 min total)

```
[5 min]  Music bed       → Suno.com
[10 min] Voice over      → ElevenLabs (free tier)
[5 min]  SFX punctuation → Freesound (3-4 sons à télécharger)
[10 min] Mux + level     → ffmpeg one-liner
```

Le résultat : un mp4 1920×1080 · 42s avec une track audio professionnelle,
prêt à uploader sur LinkedIn / X / IG.

---

## 1 · Music bed (Suno.com — gratuit, 5 min)

Va sur [suno.com](https://suno.com), clique "Create", colle exactement ce
prompt :

```
Style : minimal cinematic tech, A24-trailer feel, 78 bpm, F# minor.
Sparse piano motif, sub-bass that breathes, soft strings layer that
swells halfway. No drums until 0:14. At 0:14, a single quiet kick + hi-hat
16ths join. At 0:34, brass swells in for finale. 42 seconds. Pure
instrumental. No vocals. Mix at -22 LUFS, leave headroom for VO.

Reference : Versuz brand video, Apple keynote opener, Inception teaser bed.
```

Génère 2 variantes, garde celle qui sonne le plus posée. Télécharge le
mp3. Renomme-le **`bed.mp3`** dans `.ads/exports/manifesto/`.

---

## 2 · Voice over (ElevenLabs — free tier, 10 min)

Crée un compte sur [elevenlabs.io](https://elevenlabs.io) (10 000 chars
gratuits/mois — largement suffisant pour ce script). Choisis une voix :
**"Adam"** ou **"Brian"** pour un registre cinema (proche-mic, grave).

### Script à coller (12 lignes exactement)

Tu enregistres chaque ligne en clip séparé pour pouvoir les aligner aux
timecodes ci-dessous.

| Line  | Timecode VO       | Script                                                    |
|-------|-------------------|-----------------------------------------------------------|
| 01    | `00:02.5`         | One million SKILL-dot-M-D files on GitHub.                |
| 02    | `00:05.5`         | Which one actually works?                                 |
| 03    | `00:09.0`         | Versuz. The arena for AI agent skills.                    |
| 04    | `00:14.0`         | Three steps. That's it.                                   |
| 05    | `00:16.5`         | One : submit. One command.                                |
| 06    | `00:18.0`         | Two : three frontier judges. Every day.                   |
| 07    | `00:19.5`         | Three : public Elo. Updated every twenty-four hours.      |
| 08    | `00:24.5`         | Same suites. Same models. Pure performance.               |
| 09    | `00:29.0`         | Climb the leaderboard. Live.                              |
| 10    | `00:34.5`         | Browse for free. Install in seconds. Or earn from yours.  |
| 11    | `00:39.5`         | Submit. Compete. Win.                                     |
| 12    | `00:40.8`         | versuz dot dev.                                           |

Settings ElevenLabs :
- **Stability** : 35 (un peu de variation = humain)
- **Similarity** : 80
- **Style** : 25 (cinema)
- **Speaker boost** : on

Télécharge les 12 fichiers en `vo_01.mp3 ... vo_12.mp3` dans
`.ads/exports/manifesto/vo/`.

---

## 3 · SFX (Freesound — gratuit, 5 min)

Va sur [freesound.org](https://freesound.org), cherche puis télécharge :

| Filename            | Search query                          | Used at  |
|---------------------|---------------------------------------|----------|
| `sfx_boom.wav`      | `cinematic boom impact deep`          | 5.4s     |
| `sfx_whoosh.wav`    | `whoosh transition fast`              | 8.5s, 33.8s |
| `sfx_shimmer.wav`   | `bell shimmer riser`                  | 7.0s     |
| `sfx_click.wav`     | `terminal click ui`                   | 16.5s, 17.5s, 18.5s |
| `sfx_ding.wav`      | `chime success bell`                  | 26.5s    |

Prends les CC0 ou CC-BY. Place-les dans `.ads/exports/manifesto/sfx/`.

---

## 4 · Mux audio + vidéo (ffmpeg — 10 min)

D'abord, génère le silent mp4 :

```powershell
node scripts/export-ads.mjs --scene=manifesto
```

Puis crée le mix audio. Le plus simple : un seul appel ffmpeg avec tous
les inputs et un `amix` filter graph.

Crée un fichier `.ads/exports/manifesto/mix.txt` avec :

```
# ffmpeg concat-style input list for VO clips, timed
file 'vo/vo_01.mp3'
inpoint 0
outpoint 2.5
# ...
```

OK c'est trop manuel. Approche plus simple : utilise Reaper / Audacity
gratuit, importe les pistes en glisser-déposer, aligne aux timecodes,
exporte en `manifesto-audio.wav`. Avec Audacity (gratuit) :

1. **Track 1** : `bed.mp3` à 0:00, volume -22 dB
2. **Track 2-13** : chaque `vo_XX.mp3` au timecode du tableau, volume 0 dB
3. **Track 14-18** : SFX aux timecodes, volume -6 à -10 dB
4. Active **ducking** sur Track 1 (Audacity → Effect → Auto Duck) — input
   = mix des autres tracks, threshold -30 dB, decay 6 dB
5. **Export** → `manifesto-audio.wav`, 48 kHz stéréo

Puis mux + normalize en une commande :

```powershell
ffmpeg -i .ads\exports\manifesto\manifesto.mp4 `
       -i .ads\exports\manifesto\manifesto-audio.wav `
       -c:v copy `
       -af "loudnorm=I=-14:LRA=11:TP=-1" `
       -c:a aac -b:a 192k -shortest `
       .ads\exports\manifesto\manifesto-final.mp4
```

Résultat : `manifesto-final.mp4`, 1920×1080, 42s, audio loudness-normalisé
à -14 LUFS (target LinkedIn/X/IG), pic ≤ -1 dBTP. Prêt à uploader.

---

## Variante super-rapide (3 min, qualité OK pour Twitter)

Si tu veux juste un truc qui sonne sans Audacity :

```powershell
# bed.mp3 = music seule, manifesto.mp4 = silent video
ffmpeg -i .ads\exports\manifesto\manifesto.mp4 `
       -i .ads\exports\manifesto\bed.mp3 `
       -c:v copy `
       -af "volume=0.6" `
       -c:a aac -b:a 160k -shortest `
       .ads\exports\manifesto\manifesto-quickbed.mp4
```

Pas de VO, juste musique. Acceptable pour Twitter/X autoplay où le son
est off par défaut anyway. Pour LinkedIn / un site, mieux vaut faire la
version full avec VO.

---

## Targets de loudness (référence)

| Plateforme   | Loudness target (LUFS-i) | True peak |
|--------------|---------------------------|-----------|
| LinkedIn     | -14                       | -1 dBTP   |
| X (Twitter)  | -14                       | -1 dBTP   |
| Instagram    | -14                       | -1 dBTP   |
| YouTube      | -14                       | -1 dBTP   |
| TikTok       | -10 (plus fort)           | -1 dBTP   |

Le filter `loudnorm=I=-14:LRA=11:TP=-1` couvre 4/5 plateformes. Pour
TikTok seul, passe à `I=-10`.
