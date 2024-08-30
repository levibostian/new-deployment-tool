# new-deployment-tool

WIP tool to automate code deployments. 

> [!CAUTION]
> This tool is a WIP and not yet ready for use in your project. I suggest watching GitHub releases for this project to get notified when this tool is ready to install. 

## Why create this tool? 

I love tools such as [semantic-release](https://github.com/semantic-release/semantic-release) to automate code deployments. I have been using that tool in particular for over 5 years now and I do not want to go back to manual deployments. From my experience working with this tool on individual and team projects, I have witnessed stress and frustration in certain situations when this tool (as well as similar tools) fall short. Taking my experience using this tool, reading the source code, and interacting with the community, I decided to try and build something better. 

### Vision 

These are the requirements that I am trying to accomplish with this tool: 

1. **Learn in a couple of minutes** - New engineer onboarding on your team? Send them the logs of your last deployment and that should be enough to teach them how to use the tool. 
2. **Flexible** - No matter what type of project your team is deploying. No matter what language your team is comfortable with. You can use this tool. Everything can be customized to your preferred workflow. 
3. **Calm deployments** - When you install this tool in your project, you should not be scared to run it in fear something bad will happen. Test your configuration & fail gracefully with this tool.

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
