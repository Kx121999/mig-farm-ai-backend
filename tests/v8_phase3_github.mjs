import assert from "node:assert/strict";
import {
  validateGitHubKnowledge, getGitHubKnowledge,
  answerGitHubKnowledge, githubKnowledgeStatus
} from "../lib/knowledge_loader.js";

const status=githubKnowledgeStatus();
assert.equal(status.edition,"github");
assert.equal(status.valid,true);
assert.ok(status.entries_count>=5);

const doc=getGitHubKnowledge();
const validation=validateGitHubKnowledge(doc);
assert.equal(validation.ok,true);

const greeting=answerGitHubKnowledge("هلا",{locale:"ar"});
assert.equal(greeting,null);

const ship=answerGitHubKnowledge("عندكم توصيل للعين؟",{locale:"ar",analysis:{intent:"shipping"}});
assert.ok(ship);
assert.match(ship.reply,/13 درهم|التوصيل متاح/);

const greenhouse=answerGitHubKnowledge("عندي مزرعة 2000 متر في العين وعايز بيت محمي",{locale:"ar",analysis:{intent:"product_search"}});
assert.equal(greenhouse,null);

const branch=answerGitHubKnowledge("رقم فرع العين",{locale:"ar",analysis:{intent:"branches"}});
assert.ok(branch);
assert.match(branch.reply,/58 176 8215/);

const vat=answerGitHubKnowledge("هل السعر شامل الضريبة؟",{locale:"ar",analysis:{intent:"vat"}});
assert.ok(vat);
assert.match(vat.reply,/لا أؤكد|الضريبة/);

const unsafe=validateGitHubKnowledge({
  entries:[{id:"x",title:"جرعة",answer:"اخلط 50 مل",keywords:["جرعة"],enabled:true}]
});
assert.equal(unsafe.ok,false);

console.log("MIG FARM V8 Phase 3 GitHub Edition tests passed");
