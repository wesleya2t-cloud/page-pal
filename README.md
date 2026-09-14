# Page Pal

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Spine — a reading tracker</title>
<style>
  :root{
    --ink:#1c2541;
    --ink-2:#141a30;
    --paper:#efe6d8;
    --paper-2:#e4d8c4;
    --forest:#3f6844;
    --brick:#a6432e;
    --gold:#c9a15a;
    --line: rgba(28,37,65,0.14);
    --shadow-spine: rgba(28,37,65,0.35);
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    background:var(--paper);
    color:var(--ink);
    font-family: 'Iowan Old Style','Palatino Linotype',Georgia,serif;
    min-height:100vh;
    -webkit-font-smoothing:antialiased;
  }
  .ui{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
  }
  .wrap{
    max-width:720px;
    margin:0 auto;
    padding:28px 20px 80px;
  }
  header.top{
    display:flex;
    align-items:baseline;
    justify-content:space-between;
    margin-bottom:24px;
    border-bottom:2px solid var(--ink);
    padding-bottom:14px;
  }
  header.top h1{
    font-size:28px;
    margin:0;
    letter-spacing:0.2px;
    font-weight:600;
  }
  header.top .tag{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:12px;
    color:var(--ink);
    opacity:0.55;
  }

  /* stat strip */
  .stats{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:1px;
    background:var(--line);
    border:1px solid var(--line);
    margin-bottom:28px;
  }
  .stat{
    background:var(--paper);
    padding:14px 10px;
    text-align:center;
  }
  .stat .num{
    font-size:26px;
    font-weight:600;
    line-height:1;
    display:block;
  }
  .stat .lab{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:11px;
    opacity:0.6;
    margin-top:6px;
    display:block;
  }
  .stat.streak .num{ color:var(--brick); }

  section.block{
    margin-bottom:32px;
  }
  section.block h2{
    font-size:15px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-weight:600;
    text-transform:none;
    margin:0 0 12px;
    color:var(--ink);
  }

  /* the shelf */
  .shelf{
    display:flex;
    flex-wrap:wrap;
    gap:0;
    align-items:flex-end;
    border-bottom:6px solid var(--ink);
    padding-bottom:0;
    min-height:150px;
  }
  .spine{
    position:relative;
    height:140px;
    width:34px;
    border-radius:3px 3px 0 0;
    display:flex;
    align-items:flex-end;
    justify-content:center;
    cursor:pointer;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 2px 0 4px var(--shadow-spine);
    transition: transform 0.15s ease;
    flex-shrink:0;
    overflow:hidden;
  }
  .spine:hover{ transform: translateY(-4px); }
  .spine .fill{
    position:absolute;
    bottom:0; left:0; right:0;
    background:rgba(255,255,255,0.22);
  }
  .spine .title{
    writing-mode: vertical-rl;
    transform:rotate(180deg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:10.5px;
    color:#fff;
    padding:8px 0;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    max-height:124px;
    letter-spacing:0.2px;
    z-index:1;
  }
  .spine.done{ opacity:0.55; }
  .shelf-empty{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:13px;
    opacity:0.5;
    padding:20px 0;
  }

  /* add book form */
  .card{
    background:var(--paper-2);
    border:1px solid var(--line);
    border-radius:4px;
    padding:16px;
  }
  .row{
    display:flex;
    gap:10px;
    margin-bottom:10px;
    flex-wrap:wrap;
  }
  .row input{
    flex:1;
    min-width:110px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:14px;
    padding:10px 12px;
    border:1px solid var(--line);
    border-radius:3px;
    background:var(--paper);
    color:var(--ink);
  }
  .row input:focus{ outline:2px solid var(--forest); outline-offset:1px; }
  button{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:14px;
    font-weight:600;
    padding:10px 16px;
    border:none;
    border-radius:3px;
    background:var(--ink);
    color:var(--paper);
    cursor:pointer;
  }
  button:hover{ background:var(--ink-2); }
  button.secondary{
    background:transparent;
    color:var(--ink);
    border:1px solid var(--ink);
  }
  button.ghost{
    background:transparent;
    color:var(--brick);
    border:1px solid var(--brick);
    font-size:12px;
    padding:6px 10px;
  }

  /* active book list for logging */
  .book-log{
    display:flex;
    flex-direction:column;
    gap:10px;
  }
  .book-log-item{
    display:flex;
    align-items:center;
    gap:12px;
    background:var(--paper-2);
    border:1px solid var(--line);
    border-radius:4px;
    padding:12px 14px;
  }
  .book-log-item .meta{ flex:1; min-width:0; }
  .book-log-item .meta .t{
    font-weight:600;
    font-size:15px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .book-log-item .meta .p{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:12px;
    opacity:0.6;
    margin-top:2px;
  }
  .progress-bar{
    height:5px;
    background:var(--line);
    border-radius:3px;
    margin-top:6px;
    overflow:hidden;
  }
  .progress-bar > div{
    height:100%;
    background:var(--forest);
  }
  .book-log-item input[type=number]{
    width:64px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    padding:8px;
    border:1px solid var(--line);
    border-radius:3px;
    background:var(--paper);
    color:var(--ink);
    font-size:14px;
    text-align:center;
  }

  /* activity feed */
  .feed{
    display:flex;
    flex-direction:column;
    gap:0;
  }
  .feed-item{
    display:flex;
    justify-content:space-between;
    align-items:baseline;
    padding:10px 0;
    border-bottom:1px solid var(--line);
    font-size:14px;
  }
  .feed-item .d{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:11px;
    opacity:0.5;
  }
  .empty-note{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:13px;
    opacity:0.5;
  }

  /* share card */
  .share-card{
    background:var(--ink);
    color:var(--paper);
    border-radius:6px;
    padding:26px;
    margin-top:14px;
  }
  .share-card .h{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:11px;
    opacity:0.6;
    margin-bottom:14px;
  }
  .share-card .big{
    font-size:40px;
    font-weight:600;
    line-height:1;
  }
  .share-card .row3{
    display:flex;
    gap:24px;
    margin-top:18px;
  }
  .share-card .row3 div span{
    display:block;
  }
  .share-card .row3 .n{ font-size:20px; font-weight:600; }
  .share-card .row3 .l{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:11px; opacity:0.6; margin-top:2px;
  }

  footer.foot{
    text-align:center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:11px;
    opacity:0.4;
    margin-top:40px;
  }

  @media (prefers-reduced-motion: reduce){
    .spine{ transition:none; }
  }

  /* houses / gamification */
  .house-pick{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
  }
  .house-card{
    border:2px solid transparent;
    border-radius:5px;
    padding:14px;
    cursor:pointer;
    color:#fff;
  }
  .house-card h3{
    margin:0 0 4px;
    font-size:15px;
  }
  .house-card p{
    margin:0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:11.5px;
    opacity:0.85;
  }
  .house-banner{
    display:flex;
    align-items:center;
    gap:14px;
    border-radius:5px;
    padding:14px 16px;
    color:#fff;
    margin-bottom:28px;
  }
  .house-banner .hb-name{ font-size:16px; font-weight:600; }
  .house-banner .hb-motto{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:11.5px; opacity:0.85; margin-top:2px;
  }
  .house-banner .hb-level{ margin-left:auto; text-align:right; }
  .house-banner .hb-level .n{ font-size:20px; font-weight:600; }
  .house-banner .hb-level .l{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:10.5px; opacity:0.75;
  }
  .xp-bar{
    height:5px;
    background:rgba(255,255,255,0.25);
    border-radius:3px;
    margin-top:8px;
    overflow:hidden;
    width:100%;
  }
  .xp-bar > div{ height:100%; background:#fff; }
  .house-banner .hb-main{ flex:1; }

  /* notes */
  textarea.notes{
    width:100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:13px;
    padding:8px 10px;
    border:1px solid var(--line);
    border-radius:3px;
    background:var(--paper);
    color:var(--ink);
    resize:vertical;
    min-height:34px;
    margin-top:8px;
  }

  /* photos */
  .photo-row{
    display:flex;
    align-items:center;
    gap:8px;
    margin-top:8px;
  }
  .photo-btn{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:12px;
    padding:6px 10px;
    border:1px solid var(--ink);
    background:transparent;
    color:var(--ink);
    border-radius:3px;
    cursor:pointer;
  }
  .photo-thumb{
    width:34px; height:34px;
    object-fit:cover;
    border-radius:3px;
    border:1px solid var(--line);
  }
  .feed-item img.photo-thumb{ margin-left:8px; }

  /* timer */
  .timer-box{
    display:flex;
    align-items:center;
    gap:14px;
    background:var(--paper-2);
    border:1px solid var(--line);
    border-radius:4px;
    padding:12px 14px;
    margin-bottom:14px;
  }
  .timer-box .tval{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    font-size:20px;
    font-weight:600;
    min-width:70px;
  }







  


    

Spine


    your reading, tracked



  


    


      

Choose your reading house


      


    



  


    


      


      


      


    


    


      

1


      

level


    



  


    


      0
      day streak
    


    


      0
      pages this week
    


    


      0
      pages this month
    


    


      0
      books finished
    



  


    00:00
    Start reading timer
    



  


    Reading
    Studying



  


    

Shelf


    



  


    

Log today's reading


    


    

Add a book below to start logging.



  


    

Log a study session


    


      


        
        
      


      


        
      


      Log session
    


    

Subjects


    


    

No study sessions logged yet.



  


    

Add a book


    


      


        
        
      


      


        
        
      


      


        
           Want to read (haven't started)
        
        Add to shelf
      


      


        📷 Add cover photo
        
        
      


    



  


    

Want to read


    


    

Nothing on your list yet — add a book above and check "want to read".



  


    

History — books you've finished


    


    

No finished books yet.



  


    

Activity


    


    

Nothing logged yet.



  


    

Share card


    


      

SPINE · THIS WEEK


      

0 pages


      


        

0day streak


        

0books finished


        

0in progress


      


    


    


      Long-press or screenshot this card to share
    



  

local to this device · data stays in your browser





Spine — a Strava-style tracker for reading and studying. Core objects: books (title, author, total pages, current page, status: want/reading/finished, notes, cover photo, recommended-by), reading sessions (pages read, date, optional photo), study sessions (subject, minutes, notes). Gamification: 4 original "reading houses" (not Hogwarts-branded) with color/motto, XP from pages read + study minutes, levels. Streak = consecutive days with any reading or study activity. Lists: shelf (visual spines with fill %), currently reading, want to read, finished history, subjects (study time totals). Share card summarizing weekly pages/streak/books. Currently a single-file HTML app using localStorage — needs migration to accounts + a real database (e.g. Supabase) to support the friends layer: recommendations, kudos, leaderboards.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f0fc17b6-1396-4cf0-a6d0-1e28fcc6be41).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
