---
title: Hello world!
description: A decade late to the blogging party. Here's why I finally started, and how I built the whole thing in under a day.
pubDate: 2026-05-11
readingTime: 2 min read
tags:
  - meta
  - building-in-public
  - astro
  - github-pages
---

I guess I have a blog now.
I might be a decade late to the party, but at least I arrive in style 😆

## Why make a blog

I'm building CarApp - a social platform for cars - from scratch, and I want to document the whole thing as it happens. Every decision, every dead end, every thing that took two days longer than it should have. A blog is the right format for that.

## How I made it

To create this blog I had the following principles in mind:

1. It should cost me nothing (apart from buying the domain)
2. I should have full control over customizing it
3. Everyone should be free to read and comment

I considered Medium but users can run into paywalls even with free articles. I have Wordpressphobia so that is out of the question. There might be some better alternatives but I decided to make something custom and Claude suggested [Astro](https://astro.build/) as the framework for building it. I had used [Hugo](https://gohugo.io/) and [11ty](https://www.11ty.dev/) before but I had no strong preference for any of them as long as they get the job done with minimum friction.

I have a [PARA](https://fortelabs.com/blog/para/) setup for managing my content, and that is where I write the blog posts, while I made a separate git project for the blog code itself, acting as the publishing layer. Since the PARA folder lives in Windows and the repo codebase is in WSL, Claude made a simple script for a one-way sync between the two (though symlinks could have probably worked as well)

For hosting I was already set on using GitHub Pages as it had everything I needed (including auto-setting SSL certificates). For the theme I wanted something clean and minimalist, so I landed on [this Tailwind-based one by William Cachamwri](https://github.com/williamcachamwri/astro-blog) - although it's a bit too animation heavy for my taste, which takes a toll on the performance.

[Cusdis](https://cusdis.com/) was the choice for content moderation as it integrates nicely with Astro and it has a solid free tier. Unfortunately the email notifications system was not working, but it supports webhooks so I used that as a workaround.

The entire process took less than one day and went very smoothly. The only bump in the road was getting the Spotify integration to work. That's not something I would normally add, but it's a cute gimmick which came out of the box. The issue was that since I didn't have a backend system for this, I needed a way to manage the API keys. Claude came once again to the rescue, suggesting a Cloudflare worker with its own secrets, which was a smooth workaround, even though it took some attempts to get it working.

Best of all, this was the perfect excuse to make a quick logo for myself.

<div style="display:flex;justify-content:center;padding:2rem 0; background:rgba(128,128,128,0.1); border-radius:8px;">
<svg class="logo-anim-loop" width="96" height="96" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<mask id="logo-post-mask" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="4" y="7" width="56" height="43">
<rect width="55.812" height="41.1258" transform="matrix(1 0 0 -1 4.11429 49.0373)" fill="white"/>
</mask>
<g mask="url(#logo-post-mask)">
<path data-animate="m-left" opacity="0.5" d="M10.13 46.7332V20.6165H13.6742L24.2113 47.1361" stroke="currentColor" stroke-width="6" stroke-linecap="square" pathLength="1"/>
<path data-animate="m-right" d="M39.9305 46.7332V20.6165H36.3863L24.2811 50.9753" stroke="currentColor" stroke-width="6" stroke-linecap="square" pathLength="1"/>
<path data-animate="i-stem" d="M53.8621 30.771L53.8621 49.1625" stroke="currentColor" stroke-width="6" pathLength="1"/>
<circle data-animate="i-dot" cx="53.8269" cy="23.4375" r="2.82109" fill="currentColor"/>
</g>
</svg>
</div>

It works in both light and dark mode - including the favicon. The trick is this `<style>` block in the SVG that handles the switching:

```xml
<svg>
   <style>
      path {fill: #000}
      @media (prefers-color-scheme: dark) { path {fill: #ffffff} }
    </style>
   <path ... />
</svg>
```

<!-- If you're curious what the building-in-public part looks like in practice - the posts are right there in the navigation. -->
