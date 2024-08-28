# new-deployment-tool

WIP new deployment tool

# Getting started 

```yml
jobs: 
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write # required to push new github releases           
    steps:
      - uses: actions/checkout@v4
      - uses: levibostian/new-deployment-tool@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Below is an example of deployment scripts being written in Python. 
          # You can use whatever language or tools you want! 
          # Add 1+ commands below that will all be executed when a deployment occurs. 
          deploy_commands: |
            pip install -r requirements.txt 
            python test.py
```

# Development

`GITHUB_REF="refs/heads/main" GITHUB_REPOSITORY="levibostian/Wendy-iOS" DRY_RUN=true INPUT_GITHUB_TOKEN="XXX" deno run --allow-all deploy.ts`

# Tests

`deno test`
