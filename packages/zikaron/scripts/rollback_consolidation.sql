-- Rollback for project consolidation (2026-02-16T02:27:02.011645)
-- Run: sqlite3 ~/.local/share/zikaron/zikaron.db < rollback_consolidation.sql

UPDATE chunks SET project = 'claude-golem' WHERE project = 'golems' /* was: 61811 rows */;
UPDATE chunks SET project = 'domica-apps-public' WHERE project = 'domica' /* was: 27180 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-golems' WHERE project = 'golems' /* was: 17694 rows */;
UPDATE chunks SET project = '' WHERE project = 'unknown' /* was: 17331 rows */;
UPDATE chunks SET project = 'ralph' WHERE project = 'golems' /* was: 10611 rows */;
UPDATE chunks SET project = 'rudy-monorepo-apps-jem' WHERE project = 'rudy-monorepo' /* was: 4477 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-domica' WHERE project = 'domica' /* was: 2993 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Desktop-Gits' WHERE project = 'unknown' /* was: 1385 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits' WHERE project = 'unknown' /* was: 1036 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-songscript' WHERE project = 'songscript' /* was: 770 rows */;
UPDATE chunks SET project = 'domica-worktrees-fix-blog' WHERE project = 'domica' /* was: 758 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-golems-packages-content' WHERE project = 'golems' /* was: 738 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-taba' WHERE project = 'taba' /* was: 616 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-golems-packages-autonomous' WHERE project = 'golems' /* was: 521 rows */;
UPDATE chunks SET project = '-Users-etanheyman' WHERE project = 'unknown' /* was: 399 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-golems-packages-zikaron' WHERE project = 'golems' /* was: 297 rows */;
UPDATE chunks SET project = '-' WHERE project = 'unknown' /* was: 268 rows */;
UPDATE chunks SET project = 'songscript-haiku' WHERE project = 'songscript' /* was: 224 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-recruiterGolem' WHERE project = 'golems' /* was: 184 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-contentGolem' WHERE project = 'golems' /* was: 178 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-etanheyman-com' WHERE project = 'etanheyman-com' /* was: 161 rows */;
UPDATE chunks SET project = 'songscript-nightshift-1769910280178' WHERE project = 'songscript' /* was: 59 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-golems-packages-coach' WHERE project = 'golems' /* was: 46 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-songscript-nightshift-1771120902191' WHERE project = 'songscript' /* was: 21 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-songscript-nightshift-1770775282043' WHERE project = 'songscript' /* was: 21 rows */;
UPDATE chunks SET project = 'zikaron' WHERE project = 'golems' /* was: 19 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-golems-packages-ralph' WHERE project = 'golems' /* was: 15 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-EtanHey' WHERE project = 'EtanHey' /* was: 15 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-tellerGolem' WHERE project = 'golems' /* was: 7 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Gits-monitorGolem' WHERE project = 'golems' /* was: 4 rows */;
UPDATE chunks SET project = '-Users-etanheyman-Desktop' WHERE project = 'unknown' /* was: 2 rows */;
