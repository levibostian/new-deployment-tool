import { assertEquals } from "jsr:@std/assert@1";
import { afterEach, describe, it } from "jsr:@std/testing@1/bdd";
import { restore, stub } from "jsr:@std/testing@1/mock";
import { GetLatestReleaseStepImpl } from "./lib/steps/get-latest-release.ts";
import { run } from "./deploy.ts";

// describe("run the tool", () => {
//   afterEach(() => {
//     restore();
//   });

//   it("given new commit created during deployment, expect create release from new commit", async () => {
//     stub(
//       GetLatestReleaseStepImpl,
//       "getLatestReleaseForBranch",
//       async (args) => {
//         return {
//           tag: {
//             name: "1.0.0",
//             commit: {
//               sha: "1234567890",
//             },
//           },
//           name: "v1.0.0",
//           created_at: new Date(),
//         };
//       },
//     );

//     // TODO: you will need to mock more steps here

//     await run({ getLatestReleaseStep: GetLatestReleaseStepImpl });

//     // TODO: you will need to assert that the correct steps were called
//   });

//   it("given no new commits created during deployment, expect create release from latest commit found on github", async () => {
//   });
// });
