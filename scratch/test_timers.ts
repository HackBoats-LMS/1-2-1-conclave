import { prisma } from "../lib/prisma";

async function main() {
  console.log("Testing Dynamic Timers in GameState...");
  
  let state = await prisma.gameState.findFirst();
  console.log("Initial state:", state);

  console.log("\nUpdating timers to: Briefing 10s, Pitch 15s, Referral 20s");
  if (state) {
    state = await prisma.gameState.update({
      where: { id: state.id },
      data: { briefingDuration: 10, pitchDuration: 15, referralDuration: 20 }
    });
  } else {
    state = await prisma.gameState.create({
      data: { briefingDuration: 10, pitchDuration: 15, referralDuration: 20 }
    });
  }

  console.log("Updated state:", state);
  
  if (state.briefingDuration === 10 && state.pitchDuration === 15 && state.referralDuration === 20) {
    console.log("\nSUCCESS: Timers successfully updated in the database!");
  } else {
    console.error("\nERROR: Timers were not updated correctly.");
  }

  // Restore defaults
  console.log("\nRestoring default timers (60, 60, 30)...");
  await prisma.gameState.update({
    where: { id: state.id },
    data: { briefingDuration: 60, pitchDuration: 60, referralDuration: 30 }
  });
  console.log("Restored successfully.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
