<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep shared navigation and replay state in the root AppShell; each analysis section has a dedicated leaf route for reliable navigation and page metadata.
- Keep the public TweetEval corpus bundled locally and derive analytics from preserved labels; this makes results reproducible without platform credentials.
- Label activity as historical dataset replay and leave unconnected platforms explicit; simulated activity must never imply authorized live API access.
