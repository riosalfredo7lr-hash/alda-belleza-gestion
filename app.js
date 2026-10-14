// AlDa Belleza Gestión — MVP conectado a Supabase
// Configurá SUPABASE_URL y SUPABASE_ANON_KEY en este archivo después de crear el proyecto.
const SUPABASE_URL = "https://oohbozrjnbjzywsfnxmd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bWcqtjxLHCT7aNOnkI3Eyg_zqCe1UpM";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PEGAR_AQUI") && !SUPABASE_ANON_KEY.includes("PEGAR_AQUI");
const $ = (s) => document.querySelector(s);
let db = null, currentUser = null, currentPage = "dashboard", modalSaveHandler = null;
let cache = {products:[], customers:[], orders:[], payments:[]};
const money = n => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:2}).format(Number(n)||0);
const date = d => d ? new Date(d+"T12:00:00").toLocaleDateString("es-AR") : "—";
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),2800)}
function setNotice(msg){$("#setupNotice").textContent=msg;$("#setupNotice").classList.remove("hidden")}
function hideNotice(){$("#setupNotice").classList.add("hidden")}
function showAuth(message=""){ $("#authView").classList.remove("hidden");$("#appView").classList.add("hidden");$("#authMessage").textContent=message; }
function showApp(){ $("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");$("#userEmail").textContent=currentUser?.email||""; }
async function init(){
  if(!configured){setNotice("Configuración pendiente: seguí el archivo LEEME para conectar la base de datos compartida. La aplicación todavía no guarda información.");showAuth();return}
  db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {data:{session}}=await db.auth.getSession();
  if(session){currentUser=session.user;showApp();await loadAll()}else showAuth();
  db.auth.onAuthStateChange(async(_event,session)=>{currentUser=session?.user||null;if(currentUser){showApp();await loadAll()}else showAuth()});
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!db){$("#authMessage").textContent="Primero hay que conectar Supabase siguiendo el archivo LEEME.";return}const {error}=await db.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});if(error)$("#authMessage").textContent=error.message});
$("#logoutBtn").addEventListener("click",async()=>{if(db)await db.auth.signOut()});
$("#refreshBtn").addEventListener("click",()=>loadAll(true));
$("#nav").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(!b)return;currentPage=b.dataset.page;document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x===b));renderPage()});
async function fetchTable(table, order="created_at"){
  const {data,error}=await db.from(table).select("*").order(order,{ascending:false});
  if(error){console.error(table,error);return []}return data||[];
}
async function loadAll(notify=false){
  if(!db||!currentUser)return;
  const [products,customers,orders,payments]=await Promise.all([fetchTable("products"),fetchTable("customers"),fetchTable("orders"),fetchTable("payments")]);
  cache={products,customers,orders,payments};renderPage();if(notify)toast("Datos actualizados");
}
function sumPaid(orderId){return cache.payments.filter(p=>p.order_id===orderId).reduce((s,p)=>s+Number(p.amount||0),0)}
function orderTotal(o){return Number(o.total||0)}
function balance(o){return Math.max(0,orderTotal(o)-sumPaid(o.id))}
function badgeStatus(s){let c=s==="Entregado"||s==="Pagado"?"green":s==="Pendiente"||s==="Esperando producto"?"amber":s==="Cancelado"?"red":"";return `<span class="badge ${c}">${esc(s||"Pendiente")}</span>`}
function stat(label,value,hint){return `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`}
function table(headers,rows,empty="Todavía no hay registros."){return `<div class="table-panel"><div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.join(""):`<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div></div>`}
function renderPage(){
  const titles={dashboard:"Resumen",orders:"Ventas y pedidos",products:"Productos y stock",customers:"Clientes",payments:"Pagos y deudas"};
  $("#pageTitle").textContent=titles[currentPage];
  if(currentPage==="dashboard")renderDashboard();
  if(currentPage==="products")renderProducts();
  if(currentPage==="customers")renderCustomers();
  if(currentPage==="orders")renderOrders();
  if(currentPage==="payments")renderPayments();
}
function renderDashboard(){
  const today=new Date().toISOString().slice(0,10);
  const todayOrders=cache.orders.filter(o=>o.order_date===today);
  const sold=todayOrders.reduce((s,o)=>s+orderTotal(o),0);
  const collected=cache.payments.filter(p=>p.payment_date===today).reduce((s,p)=>s+Number(p.amount||0),0);
  const debts=cache.orders.reduce((s,o)=>s+balance(o),0);
  const low=cache.products.filter(p=>Number(p.stock||0)<=Number(p.min_stock||0));
  $("#pageContent").innerHTML=`<div class="stats">${stat("Ventas de hoy",money(sold),`${todayOrders.length} operaciones registradas`)}${stat("Cobrado hoy",money(collected),"Pagos recibidos hoy")}${stat("Pendiente de cobro",money(debts),"Saldo abierto de pedidos")}${stat("Productos con stock bajo",low.length,"Según mínimo configurado")}</div>
  <div class="two-col"><section><div class="section-head"><h3>Últimos pedidos</h3><button class="secondary" data-go="orders">Ver todos</button></div>${table(["Fecha","Cliente","Total","Estado"],cache.orders.slice(0,5).map(o=>`<tr><td>${date(o.order_date)}</td><td>${esc(customerName(o.customer_id))}</td><td>${money(o.total)}</td><td>${badgeStatus(o.status)}</td></tr>`))}</section><section class="panel"><h3>Para revisar</h3><p class="inline-note">Estos indicadores se actualizan con los datos compartidos de ambos usuarios.</p><div class="section-head"><span>Stock bajo</span><strong>${low.length}</strong></div>${low.slice(0,5).map(p=>`<p>${esc(p.name)} <span class="muted">· ${p.stock} unidades</span></p>`).join("")||`<p class="muted">No hay alertas de stock.</p>`}<div class="section-head"><span>Pedidos con saldo</span><strong>${cache.orders.filter(o=>balance(o)>0).length}</strong></div><p class="inline-note">Entrá en “Pagos y deudas” para ver los saldos y registrar cobros.</p></section></div>`;
  $("#pageContent").querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{currentPage=b.dataset.go;renderPage()});
}
function customerName(id){return cache.customers.find(c=>c.id===id)?.name||"Cliente eliminado/sin asignar"}
function renderProducts(){
  const rows=cache.products.map(p=>`<tr><td><strong>${esc(p.name)}</strong><br><span class="tiny muted">${esc(p.brand||"Sin marca")}</span></td><td>${esc(p.category||"—")}</td><td>${money(p.cost)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${Number(p.stock)<=Number(p.min_stock||0)?'<span class="badge amber">Stock bajo</span>':'<span class="badge green">Disponible</span>'}</td><td><button class="secondary" data-edit="${p.id}">Editar</button></td></tr>`);
  $("#pageContent").innerHTML=`<div class="section-head"><div><h3>Catálogo y existencias</h3><p class="inline-note">Registrá costo, precio y cantidad. El stock inicial se carga manualmente.</p></div><button class="primary" id="addProduct">＋ Producto</button></div>${table(["Producto","Categoría","Costo","Precio","Stock","Estado",""],rows)}`;
  $("#addProduct").onclick=()=>productModal();$("#pageContent").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>productModal(cache.products.find(p=>p.id===b.dataset.edit)));
}
function renderCustomers(){
  const rows=cache.customers.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.phone||"—")}</td><td>${esc(c.instagram||"—")}</td><td>${esc(c.notes||"—")}</td><td><button class="secondary" data-edit="${c.id}">Editar</button></td></tr>`);
  $("#pageContent").innerHTML=`<div class="section-head"><div><h3>Agenda de clientes</h3><p class="inline-note">Guardá WhatsApp, Instagram y notas útiles.</p></div><button class="primary" id="addCustomer">＋ Cliente</button></div>${table(["Cliente","Teléfono","Instagram","Notas",""],rows)}`;
  $("#addCustomer").onclick=()=>customerModal();$("#pageContent").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>customerModal(cache.customers.find(c=>c.id===b.dataset.edit)));
}
function renderOrders(){
  const rows=cache.orders.map(o=>`<tr><td>${date(o.order_date)}</td><td><strong>${esc(customerName(o.customer_id))}</strong><br><span class="tiny muted">${esc(o.source||"—")}</span></td><td>${esc(o.order_type||"—")}</td><td>${money(o.total)}</td><td>${money(balance(o))}</td><td>${badgeStatus(o.status)}</td><td><button class="secondary" data-pay="${o.id}">Registrar pago</button></td></tr>`);
  $("#pageContent").innerHTML=`<div class="section-head"><div><h3>Ventas y encargos</h3><p class="inline-note">El registro de pedido y los pagos se administran por separado.</p></div><button class="primary" id="addOrder">＋ Nueva venta / pedido</button></div>${table(["Fecha","Cliente / origen","Tipo","Total","Debe","Estado",""],rows)}`;
  $("#addOrder").onclick=()=>orderModal();$("#pageContent").querySelectorAll("[data-pay]").forEach(b=>b.onclick=()=>paymentModal(b.dataset.pay));
}
function renderPayments(){
  const debts=cache.orders.filter(o=>balance(o)>0);
  const rows=debts.map(o=>`<tr><td><strong>${esc(customerName(o.customer_id))}</strong></td><td>${date(o.order_date)}</td><td>${money(o.total)}</td><td>${money(sumPaid(o.id))}</td><td><strong>${money(balance(o))}</strong></td><td><button class="primary" data-pay="${o.id}">＋ Cobrar</button></td></tr>`);
  const payRows=cache.payments.slice(0,12).map(p=>`<tr><td>${date(p.payment_date)}</td><td>${esc(customerName(cache.orders.find(o=>o.id===p.order_id)?.customer_id))}</td><td>${money(p.amount)}</td><td>${esc(p.method||"—")}</td><td>${esc(p.notes||"—")}</td></tr>`);
  $("#pageContent").innerHTML=`<div class="stats">${stat("Deuda total",money(debts.reduce((s,o)=>s+balance(o),0)),"Saldo pendiente de clientes")}${stat("Clientes con deuda",new Set(debts.map(o=>o.customer_id).filter(Boolean)).size,"Con al menos un saldo abierto")}</div><div class="section-head"><h3>Saldos pendientes</h3></div>${table(["Cliente","Fecha","Total","Pagado","Saldo",""],rows,"¡No hay saldos pendientes!") }<div class="section-head"><h3>Últimos cobros registrados</h3></div>${table(["Fecha","Cliente","Importe","Medio","Nota"],payRows,"Todavía no hay pagos registrados.")}`;
  $("#pageContent").querySelectorAll("[data-pay]").forEach(b=>b.onclick=()=>paymentModal(b.dataset.pay));
}
function openModal(title,body,onSave){
  $("#modalTitle").textContent=title;$("#modalBody").innerHTML=body;modalSaveHandler=onSave;$("#modal").showModal();
}
$("#modalForm").addEventListener("submit",async e=>{if(e.submitter?.value!=="save")return;e.preventDefault();if(!modalSaveHandler)return;const btn=$("#modalSave");btn.disabled=true;try{await modalSaveHandler(new FormData($("#modalForm")));$("#modal").close();await loadAll();toast("Registro guardado")}catch(err){toast(err.message||"No se pudo guardar")}finally{btn.disabled=false}});
function val(fd,k){return String(fd.get(k)||"").trim()}
function nval(fd,k){return Number(fd.get(k)||0)}
async function saveRow(table,data,id){let q=id?db.from(table).update(data).eq("id",id):db.from(table).insert(data);const {error}=await q;if(error)throw error}
function productModal(p=null){
  openModal(p?"Editar producto":"Nuevo producto",`<div class="form-grid">
  <label class="field wide">Nombre<input name="name" required value="${esc(p?.name||"")}"></label>
  <label class="field">Marca<select name="brand"><option ${p?.brand==="Avon"?"selected":""}>Avon</option><option ${p?.brand==="Natura"?"selected":""}>Natura</option><option ${p?.brand==="Otra"?"selected":""}>Otra</option></select></label>
  <label class="field">Categoría<input name="category" value="${esc(p?.category||"")}"></label>
  <label class="field">Costo ($)<input name="cost" type="number" min="0" step=".01" required value="${p?.cost??0}"></label>
  <label class="field">Precio de venta ($)<input name="price" type="number" min="0" step=".01" required value="${p?.price??0}"></label>
  <label class="field">Stock actual<input name="stock" type="number" min="0" step="1" required value="${p?.stock??0}"></label>
  <label class="field">Avisar con stock igual o menor a<input name="min_stock" type="number" min="0" step="1" value="${p?.min_stock??2}"></label>
  </div>`,async fd=>{await saveRow("products",{name:val(fd,"name"),brand:val(fd,"brand"),category:val(fd,"category"),cost:nval(fd,"cost"),price:nval(fd,"price"),stock:nval(fd,"stock"),min_stock:nval(fd,"min_stock"),updated_by:currentUser.id},p?.id)});
}
function customerModal(c=null){
  openModal(c?"Editar cliente":"Nuevo cliente",`<div class="form-grid">
  <label class="field wide">Nombre y apellido<input name="name" required value="${esc(c?.name||"")}"></label>
  <label class="field">Teléfono / WhatsApp<input name="phone" value="${esc(c?.phone||"")}"></label>
  <label class="field">Instagram<input name="instagram" value="${esc(c?.instagram||"")}"></label>
  <label class="field wide">Notas<textarea name="notes" rows="3">${esc(c?.notes||"")}</textarea></label>
  </div>`,async fd=>{await saveRow("customers",{name:val(fd,"name"),phone:val(fd,"phone"),instagram:val(fd,"instagram"),notes:val(fd,"notes"),updated_by:currentUser.id},c?.id)});
}
function orderModal(){
  if(!cache.customers.length)throwToast("Primero cargá al menos un cliente.");
  openModal("Nueva venta o pedido",`<div class="form-grid">
  <label class="field wide">Cliente<select name="customer_id" required>${cache.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
  <label class="field">Tipo<select name="order_type"><option>Stock disponible</option><option>Encargo</option></select></label>
  <label class="field">Origen<select name="source"><option>WhatsApp</option><option>Instagram</option><option>Presencial</option><option>Otro</option></select></label>
  <label class="field">Fecha<input name="order_date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label>
  <label class="field">Estado<select name="status"><option>Pagado</option><option>Pendiente</option><option>Esperando producto</option><option>Listo para entregar</option><option>Entregado</option><option>Cancelado</option></select></label>
  <label class="field wide">Total de la venta ($)<input name="total" type="number" min="0" step=".01" required></label>
  <label class="field wide">Nota / productos incluidos<textarea name="notes" rows="2" placeholder="Ej.: perfume + jabón líquido"></textarea></label>
  <p class="inline-note wide">En esta primera versión se registra el total y la descripción. El descuento automático de unidades de stock por producto se agregará en la siguiente etapa, para evitar errores en las existencias.</p>
  </div>`,async fd=>{const {data,error}=await db.from("orders").insert({customer_id:val(fd,"customer_id"),order_type:val(fd,"order_type"),source:val(fd,"source"),order_date:val(fd,"order_date"),status:val(fd,"status"),total:nval(fd,"total"),notes:val(fd,"notes"),created_by:currentUser.id}).select().single();if(error)throw error;
    // Si el usuario marca contado/pagado, el cobro queda asentado también.
    if(val(fd,"status")==="Pagado"&&nval(fd,"total")>0){const {error:pe}=await db.from("payments").insert({order_id:data.id,amount:nval(fd,"total"),payment_date:val(fd,"order_date"),method:"Contado",notes:"Cobro inicial automático",created_by:currentUser.id});if(pe)throw pe}
  });
}
function paymentModal(orderId){
  const o=cache.orders.find(x=>x.id===orderId);if(!o)return;
  openModal("Registrar cobro",`<p class="inline-note">${esc(customerName(o.customer_id))} · Total ${money(o.total)} · Saldo actual <strong>${money(balance(o))}</strong></p>
  <div class="form-grid">
  <label class="field">Importe recibido ($)<input name="amount" type="number" min=".01" max="${balance(o)}" step=".01" required value="${balance(o)}"></label>
  <label class="field">Fecha de cobro<input name="payment_date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label>
  <label class="field wide">Medio de pago<select name="method"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option><option>Otro</option></select></label>
  <label class="field wide">Nota (opcional)<input name="notes" placeholder="Ej.: segunda parte"></label></div>`,async fd=>{const amount=nval(fd,"amount");if(amount<=0||amount>balance(o)+0.001)throw new Error("El importe debe ser mayor a cero y no superar el saldo pendiente.");const {error}=await db.from("payments").insert({order_id:orderId,amount,payment_date:val(fd,"payment_date"),method:val(fd,"method"),notes:val(fd,"notes"),created_by:currentUser.id});if(error)throw error;
    const remaining=balance(o)-amount;if(remaining<=0.009){const {error:oe}=await db.from("orders").update({status:"Pagado"}).eq("id",orderId);if(oe)throw oe}
  });
}
function throwToast(msg){toast(msg)}
init();
