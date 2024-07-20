FROM denoland/deno:distroless

COPY . /action
WORKDIR /action

ENTRYPOINT ["deno", "run", "--allow-all"]
CMD ["deploy.ts"]