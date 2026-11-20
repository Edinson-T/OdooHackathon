# OdooHackathon

Shared repository for the Odoo Hackathon team. Business code will be added later.

## Team workflow

1. Clone this repository using the URL from GitHub's **Code** button.
2. Create a branch for your task:
   ```sh
   git switch main
   git pull --ff-only
   git switch -c feat/your-task
   ```
3. Make changes and commit them:
   ```sh
   git add <files>
   git commit -m "Describe your changes"
   git push -u origin feat/your-task
   ```
4. Open a pull request into `main` and ask a teammate to review it.
5. After merging, update your local `main` before starting another task.

The repository owner can invite teammates through **Settings → Collaborators**.
Never commit passwords, API keys, or local `.env` files.
