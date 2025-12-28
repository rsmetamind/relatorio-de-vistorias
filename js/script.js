document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".correcao").addEventListener("change", function () {
        const inputOutros = this.closest(".dadosCorrecao").querySelector(".outros");
        inputOutros.style.display = this.value === "OUTROS" ? "flex" : "none";

        const inputMetragem = this.closest(".dadosCorrecao").querySelector(".metragem");
        inputMetragem.style.display = isCorrecaoMetragem(this.value) ? "flex" : "none"

    });

    aplicarEventosArquivos(document.querySelector(".dadosCorrecao"));
});

function isCorrecaoMetragem(value) {
    return value === "Aplicação de Cordoalha" ||
        value === "Travessia Cordoalha" || 
        value === "Retirada de Sobra Metálica" ||
        value === "Aplicação de PEAD";
}

function onAdicionarCorrecao(e) {
    const divOriginal = document.querySelector(".dadosCorrecao");
    const clone = divOriginal.cloneNode(true);

    clone.querySelectorAll("input, select, textarea").forEach(el => {
        const type = el.getAttribute("type");

        if (type === "checkbox" || type === "radio") {
            el.checked = false;
        } else if (type === "file") {
            const novoInput = el.cloneNode(false);
            novoInput.value = "";
            el.parentNode.replaceChild(novoInput, el);
        } else {
            el.value = "";
        }
    });

    clone.querySelectorAll(".outros, .arquivosAntes2, .arquivosDepois2").forEach(el => {
        el.style.display = "none";
    });

    aplicarEventosArquivos(clone);

    clone.querySelector(".correcao").addEventListener("change", function () {
        const inputOutros = clone.querySelector(".outros");
        const inputMetragem = clone.querySelector(".metragem");
        inputOutros.style.display = this.value === "OUTROS" ? "flex" : "none";
        inputMetragem.style.display = isCorrecaoMetragem(this.value) ? "flex" : "none"
    });

    document.getElementById("correcoes").appendChild(clone);
}

function aplicarEventosArquivos(bloco) {
    const antes1 = bloco.querySelector(".arquivosAntes1");
    const antes2 = bloco.querySelector(".arquivosAntes2");
    const depois1 = bloco.querySelector(".arquivosDepois1");
    const depois2 = bloco.querySelector(".arquivosDepois2");

    antes1.addEventListener("change", function () {
        if (antes1.files.length > 0) antes2.style.display = "inline-block";
    });

    depois1.addEventListener("change", function () {
        if (depois1.files.length > 0) depois2.style.display = "inline-block";
    });
}

// Atualiza data
const hoje = new Date();
const dataFormatada = hoje.toLocaleDateString('pt-BR');
document.getElementById('dataAtual').textContent = dataFormatada;

// Geração de PDF com uma página por bloco
document.getElementById("meuFormulario").addEventListener("submit", async function (e) {
    e.preventDefault();

    const template = document.getElementById("templateRelatorio");
    const container = template.querySelector(".correcoesContainer");
    const trecho = document.querySelector('input[placeholder="Digite o trecho"]').value;

    container.innerHTML = "";
    template.querySelector(".data").textContent = document.getElementById("dataAtual").textContent;
    template.querySelector(".supervisor").textContent = document.querySelector('input[placeholder="Digite seu nome"]').value;
    template.querySelector(".trecho").textContent = document.querySelector('input[placeholder="Digite o trecho"]').value;
    template.querySelector(".referencia-do-trecho").textContent = document.querySelector('input[placeholder="Digite a referência"]').value;

    const blocos = document.querySelectorAll(".dadosCorrecao");
    
    // Crie o map fora do loop (escopo global ou da função principal)
    const contagemCorrecoes = new Map();

    for (let bloco of blocos) {
        template.querySelector(".resumoCorrecoes").style.display = "none";
        const correcao = bloco.querySelector(".correcao").value || "Não selecionada";
        const outros = bloco.querySelector(".outros").value;
        const metragem = bloco.querySelector(".metragem > input").value;
        const correcaoFinal = correcao === "OUTROS" && outros ? outros : correcao;

        // Depois de calcular correcaoFinal
        if (contagemCorrecoes.has(correcaoFinal)) {
            contagemCorrecoes.set(
                correcaoFinal,
                contagemCorrecoes.get(correcaoFinal) + 1
            );
        } else {
            contagemCorrecoes.set(correcaoFinal, 1);
        }

        const endereco = bloco.querySelectorAll(".text-down input")[0]?.value || "";
        const referencia = bloco.querySelectorAll(".text-down input")[1]?.value || "";
        const observacao = bloco.querySelector("textarea")?.value.trim() || "";

        const imagensAntes = await carregarImagens(bloco.querySelectorAll(".arquivosAntes input[type='file']"));
        const imagensDepois = await carregarImagens(bloco.querySelectorAll(".arquivosDepois input[type='file']"));

        const blocoHTML = gerarBlocoCorrecao(correcaoFinal, endereco, referencia, observacao, imagensAntes, imagensDepois, metragem);
        container.innerHTML = "";
        container.appendChild(blocoHTML);
        template.style.display = "block";

        const canvas = await html2canvas(template, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        const pdfWidth = 210;
        const pdfHeight = 297;
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (!window.pdf) {
            window.pdf = new window.jspdf.jsPDF("p", "mm", "a4");
        } else {
            window.pdf.addPage();
        }

        window.pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        template.style.display = "none";
    }
    
    template.querySelector(".correcoesContainer").innerHTML = "";

    template.style.display = "block";
    const resumo = template.querySelector(".resumoCorrecoes");
    resumo.style.display = "block";

    const tabelaBody = template.querySelector(".tabelaCorrecoes tbody");
    tabelaBody.innerHTML = "";

    contagemCorrecoes.forEach((quantidade, tipo) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="border: 1px solid #ccc; padding: 8px;">${tipo}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">
                ${quantidade}
            </td>
        `;
        tabelaBody.appendChild(tr);
    });

    // Página final
    window.pdf.addPage();

    const canvasResumo = await html2canvas(template, { scale: 2 });
    const imgResumo = canvasResumo.toDataURL("image/png");

    const imgWidth = 210;
    const imgHeight = (canvasResumo.height * imgWidth) / canvasResumo.width;

    window.pdf.addImage(imgResumo, "PNG", 0, 0, imgWidth, imgHeight);

    // Opcional: esconder de novo
    resumo.style.display = "none";
    template.style.display = "none";

    window.pdf.save(`${trecho}-${dataFormatada.replaceAll("/",".")}.pdf`);
    window.pdf = null;
});

async function carregarImagens(fileInputs) {
    const imagens = [];
    for (let input of fileInputs) {
        if (input.files.length > 0) {
            const file = input.files[0];
            const dataURL = await fileToDataURL(file);
            imagens.push(dataURL);
        }
    }
    return imagens;
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
    });
}

function gerarBlocoCorrecao(correcao, endereco, referencia, observacao, imagensAntes, imagensDepois, metragem) {
    const div = document.createElement("div");
    div.style.marginBottom = "30px";

    div.innerHTML = `
        <h3 style="color: #660099;">Correção: ${correcao}${metragem ? " - " + metragem : ""}</h3>
        <p><strong>Endereço:</strong> ${endereco}</p>
        <p><strong>Ponto de Referência:</strong> ${referencia}</p>
        ${observacao ? `<p><strong>Observação:</strong> ${observacao}</p>` : ""}

        <div style="margin-top: 10px;">
          <p><strong>Antes:</strong></p>
          <div class="imagensAntes" style="display: flex; gap: 10px; flex-wrap: wrap; width:100%"></div>
        </div>
        
        <div style="margin-top: 10px;">
          <p><strong>Depois:</strong></p>
          <div class="imagensDepois" style="display: flex; gap: 10px; flex-wrap: wrap; width:100%"></div>
        </div>
    `;

    imagensAntes.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.style.maxWidth = "170mm";   // ocupa quase toda a largura da folha
        img.style.maxHeight = "120mm";  // altura proporcional
        img.style.objectFit = "contain";
        img.style.display = "block";
        img.style.border = "1px solid #ccc";
        div.querySelector(".imagensAntes").appendChild(img);
    });

    imagensDepois.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.style.maxWidth = "170mm";   // ocupa quase toda a largura da folha
        img.style.maxHeight = "120mm";  // altura proporcional
        img.style.objectFit = "contain";
        img.style.display = "block";
        img.style.border = "1px solid #ccc";
        div.querySelector(".imagensDepois").appendChild(img);
    });

    return div;
}
