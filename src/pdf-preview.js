let library;
export function loadPdfLibrary(){
 if(!library)library=Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs,worker])=>{pdfjs.GlobalWorkerOptions.workerSrc=worker.default;return pdfjs;}).catch(error=>{library=null;throw error;});
 return library;
}
