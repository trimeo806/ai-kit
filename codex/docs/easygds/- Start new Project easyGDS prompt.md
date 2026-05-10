- Start new Project easyGDS prompt
Context: 
  - I will build the new project with frontend side like global distributed system from scratch 
  - Business logic: This project is about creating the CMS admin portal. It can help another customer relate with flight, hotels, tours booking can create their website using CMS from easyGDS provide (Drag and drop like WordPress to build a website with specific feature such as integrate with 3rd party API in our CMS, support customer to build their website with brand logo, brand color, other customization of customer about styling in our CMS website).
  - This project I will migrate the component in it created by VueJS to ReactJS with more fancy, cool animiation and more beautiful.
  - With new project I will full of rights to decide the techstacks (around NextJS ecosystem) design system, design token, architecture, integration pattern, how the source code should be structured. But I will rationale why I choose it? What are pros and cons when I choose it? Is it easy to maintain, scale, enhance, add new features? Which points I need to collect about the business before selecting the techstacks, architecture, pattern and other decisions? The technical architecture I refer in component scope is creating each component is a standalone internal package and import to internal project. This project is required using NextJS so I need to consider the cache cdn, next cache profile also and partial rendering for optimizing the performance.
  - If I jump to the kick-off meeting, what things I should prepare? Which points I should ask? Which points will affects my decisions about technical? 
Goal: 
  - Brainstorming with me about the context, what points you need me to input for clarifying the requirements. 
  - Create to me a document contain the sub-documents answer these questions above. - After that, create to me a documents with high level approach about how I can build this project from scratch. What's the step I should follow? Questions: Ask me many questions as possible for clarifying the requirements

- NextJS v14 and v16
  research about NextJS v16 compare with v14. Show me the different between 2 versions.

I have worked with NextJS. There are 2 things I confused:

- Server actions vs normal fetching data (With GET, POST, PUT, PATCH, DELETE)
- Server component and client component.
  These things: explore and explain to me about:
- What is this?
- How to use?
- When to use?
- Different between these stuffs?
- Pros and cons of each stuff?
- If choosing 1 in 2, what's aspect I need to consider about using it?

What is streaming in NextJS? Explore and explain:

- The mechanism of it
- How to use
- Pros and cons
- Which points I need to consider to use it? Edge cases of it?
  If my component is client, can I use streaming with Suspense boudary?

research about Redux (RTK and RTK query), zustand + React Query. Explore their latest document (use the context7 mcp).

- Explain their core mechanism (specially about the flows the state is updated with query - calling api and update state)
- Pros and cons of each state management.
- Which aspects to consider if choosing 1 in 2 of it?
- How to apply it efficiently (best practice and antipattern)
- Is there any state management to replace these two? Trigger subagents relate to this task