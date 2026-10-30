import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBrowserScripts } from './browser-sandbox.mjs';

const spriteUrl = 'https://example.test/sprite.png';
const item = { id: 'art_test', characters: [{key:'a',name:'드래곤',spriteUrl},{key:'b',name:'코코',spriteUrl}] };
function setup() {
    const {sandbox:s} = loadBrowserScripts(['kids/subjects/quest/monster_roster.js','kids/common_space/gallery-mini-runner.js']);
    class Element {
        constructor(tag) { this.tag=tag;this.children=[];this.style={};this.attributes={};this.hidden=false;this.textContent=''; }
        appendChild(e) {this.children.push(e);return e;}
        remove() {}
        replaceChildren() {this.children=[];}
        setAttribute(k,v) {this.attributes[k]=v;}
    }
    const host = new Element('div');
    s.document = {body:new Element('body'),getElementById:id=>id==='modalCharacterActions'?host:id==='gmr-style'?{}:null,
        createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})};
    s.currentUserName='민수';
    return {s,host};
}
test('목록: 단일 호환·배열 우선·잘못된 key/주소·중복·6개 상한',()=>{
    const {s}=setup(), r=s.MonsterRoster;
    assert.equal(r.charactersOf({character:{name:'용',spriteUrl}})[0].key,'main');
    assert.equal(r.charactersOf({}).length,0);
    assert.equal(r.charactersOf({character:{name:'용',spriteUrl},characters:[]}).length,0);
    assert.equal(r.charactersOf(item).length,2);
    assert.equal(r.charactersOf({characters:[{key:'UPPER',name:'용',spriteUrl}]}).length,0);
    assert.equal(r.charactersOf({characters:[{key:'a',name:'용',spriteUrl:'javascript:bad'}]}).length,0);
    assert.equal(r.charactersOf({characters:[...item.characters,item.characters[0]]}).length,2);
    assert.equal(r.charactersOf({characters:Array.from({length:7},(_,i)=>({key:String(i),name:'용',spriteUrl}))}).length,6);
});
test('모달: 같은 작품 A→B 교체는 해제가 아니며 고른 캐릭터를 유지한다',()=>{
    const {s,host}=setup(), r=s.MonsterRoster, g=s.GalleryMiniRunner;
    r.equipGalleryPartner('son',{artId:item.id,...item.characters[0]});
    g.bindModal(item);
    assert.equal(host.children[0].children.length,2);
    assert.match(host.children[1].textContent,/장착 중/);
    host.children[0].children[1].onclick();
    assert.doesNotMatch(host.children[1].textContent,/장착 중/);
    assert.equal(host.children[2].textContent,'🎮 코코와 달리기');
    host.children[1].onclick();
    assert.equal(r.getGalleryPartner('son').charKey,'b');
    host.children[0].children[0].onclick();
    assert.doesNotMatch(host.children[1].textContent,/장착 중/);
    assert.equal(r.getGalleryPartner('son').charKey,'b');
});
test('옛 폰 저장값은 main 장착으로 읽고 캐릭터 1개면 선택 줄이 없다',()=>{
    const {s,host}=setup();
    s.localStorage.setItem('galleryPartner_daughter',JSON.stringify({artId:'old',name:'민서',spriteUrl,equippedAt:1}));
    s.localStorage.setItem('currentUser','daughter');
    s.GalleryMiniRunner.bindModal({id:'old',character:{name:'민서',spriteUrl}});
    assert.equal(host.children.length,2);
    assert.match(host.children[0].textContent,/장착 중/);
    assert.equal(s.MonsterRoster.getGalleryPartner('daughter').charKey,'main');
    assert.equal(JSON.parse(s.localStorage.getItem('galleryPartner_daughter')).charKey,undefined);
});

test('음성: 장착·해제는 상황 문장을 프리셋 없이 읽고 퀘스트 칭찬 녹음은 쓰지 않는다',()=>{
    const {s,host}=setup(), said=[], quest=[];
    s.speakFairyTTS=(text,options)=>said.push([text,options?.skipPreset]);
    s.fairyPraise=()=>quest.push('praise'); s.fairyReward=()=>quest.push('reward');
    s.GalleryMiniRunner.bindModal(item);
    host.children[1].onclick();
    host.children[1].onclick();
    assert.deepEqual(said,[['이제 5분 퀘스트에서 드래곤이 함께해요!',true],['기본 파트너로 돌아왔어요!',true]]);
    assert.deepEqual(quest,[]);
});

import { spawnSync } from 'node:child_process';
const python = process.env.GALLERY_TEST_PYTHON || (process.platform==='win32' ? 'C:/Users/pc/AppData/Local/Python/pythoncore-3.14-64/python.exe' : 'python');
test('빌더: 단일 정규화·부분 오류·중복과 7번째 제외',()=>{
 const result=spawnSync(python,['-X','utf8','-c',String.raw`
import tempfile, importlib.util
from pathlib import Path
from PIL import Image, ImageDraw
spec=importlib.util.spec_from_file_location('builder',Path.cwd()/'scripts/build_gallery.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
with tempfile.TemporaryDirectory() as temp:
 p=Path(temp); out=p/'out';out.mkdir()
 image=Image.new('RGBA',(100,100),(0,0,0,0));ImageDraw.Draw(image).rectangle((30,20,69,79),fill='blue');image.save(p/'ok.png')
 Image.new('RGBA',(100,100),'white').save(p/'bad.png')
 def build(meta): return b.build_characters(meta,'art_test',p,out,'minsu','2026_elem_5')
 old={'name':'용','sprite':'ok.png'}
 assert build({'character':old})[0]['key']=='main'
 entries=[{'key':'a',**old},{'key':'b','name':'용','sprite':'bad.png'}]
 assert [c['key'] for c in build({'characters':entries})]==['a']
 assert len(build({'characters':[{'key':'a',**old},{'key':'a',**old}]}))==1
 assert len(build({'characters':[{'key':str(i),**old} for i in range(7)]}))==6
 assert build({'characters':[],'character':old})==[]
`],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
});
