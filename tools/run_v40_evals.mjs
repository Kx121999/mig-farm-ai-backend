import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const started=new Date().toISOString();
const run=spawnSync(process.execPath,['tests/v40_unified_evolution.mjs'],{cwd:process.cwd(),encoding:'utf8',env:{...process.env,OPENAI_API_KEY:'',AI_PIPELINE_V33:'true',AI_PIPELINE_V40:'true',ODOO_ACTIONS_ENABLED:'false'}});
const output=`${run.stdout||''}${run.stderr||''}`;
const match=output.match(/V40 unified evolution PASS — (\d+) cases/);
const report={version:'40.0.0',release:'MIG_FARM_AI_V40_UNIFIED_EVOLUTION',started_at:started,completed_at:new Date().toISOString(),passed:run.status===0,cases:match?Number(match[1]):0,checks:['v35_semantic_followups','v35_current_turn_correction','v36_entity_locked_reranking','v37_multi_layer_memory','v38_entity_scoped_product_graph','v39_diagnostic_safety','v40_no_pressure_sales','v40_single_orchestrator','end_to_end_canonical_correction_persistence','health_contract'],output:output.slice(-12000)};
writeFileSync('V40_EVALUATION_REPORT.json',JSON.stringify(report,null,2));
if(run.status!==0){console.error(output);process.exit(run.status||1);}console.log(output.trim());console.log('V40 evaluation report written: V40_EVALUATION_REPORT.json');
