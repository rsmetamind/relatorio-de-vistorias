document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".correcao").addEventListener("change", function () {
        const inputOutros = this.closest(".dadosCorrecao").querySelector(".outros");
        inputOutros.style.display = this.value === "OUTROS" ? "inline-block" : "none";
    });

    aplicarEventosArquivos(document.querySelector(".dadosCorrecao"));
});

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
        inputOutros.style.display = this.value === "OUTROS" ? "inline-block" : "none";
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

    container.innerHTML = "";
    template.querySelector(".data").textContent = document.getElementById("dataAtual").textContent;
    template.querySelector(".supervisor").textContent = document.querySelector('input[placeholder="Digite seu nome"]').value;
    template.querySelector(".trecho").textContent = document.querySelector('input[placeholder="Digite o trecho"]').value;
    template.querySelector(".tronco").textContent = document.querySelector('input[placeholder="Digite o tronco"]').value;

    const blocos = document.querySelectorAll(".dadosCorrecao");

    for (let bloco of blocos) {
        const correcao = bloco.querySelector(".correcao").value || "Não selecionada";
        const outros = bloco.querySelector(".outros").value;
        const correcaoFinal = correcao === "OUTROS" && outros ? outros : correcao;

        const endereco = bloco.querySelectorAll(".text-down input")[0]?.value || "";
        const referencia = bloco.querySelectorAll(".text-down input")[1]?.value || "";
        const observacao = bloco.querySelector("textarea")?.value.trim() || "";

        const imagensAntes = await carregarImagens(bloco.querySelectorAll(".arquivosAntes input[type='file']"));
        const imagensDepois = await carregarImagens(bloco.querySelectorAll(".arquivosDepois input[type='file']"));

        const blocoHTML = gerarBlocoCorrecao(correcaoFinal, endereco, referencia, observacao, imagensAntes, imagensDepois);
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

    window.pdf.save("relatorio-vistoria.pdf");
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

function gerarBlocoCorrecao(correcao, endereco, referencia, observacao, imagensAntes, imagensDepois) {
    const div = document.createElement("div");
    div.style.marginBottom = "30px";

    div.innerHTML = `
        <h3 style="color: #660099;">Correção: ${correcao}</h3>
        <p><strong>Endereço:</strong> ${endereco}</p>
        <p><strong>Ponto de Referência:</strong> ${referencia}</p>
        ${observacao ? `<p><strong>Observação:</strong> ${observacao}</p>` : ""}

        <div style="margin-top: 10px;">
          <p><strong>Antes:</strong></p>
          <div class="imagensAntes" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
        </div>
        
        <div style="margin-top: 10px;">
          <p><strong>Depois:</strong></p>
          <div class="imagensDepois" style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
        </div>
    `;

    imagensAntes.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.style.width = "90mm";
        img.style.height = "auto";
        img.style.border = "1px solid #ccc";
        div.querySelector(".imagensAntes").appendChild(img);
    });

    imagensDepois.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.style.width = "90mm";
        img.style.height = "auto";
        img.style.border = "1px solid #ccc";
        div.querySelector(".imagensDepois").appendChild(img);
    });

    return div;
}
