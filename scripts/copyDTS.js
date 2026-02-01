/**
 * node scripts/copyDTS.js（copy docs folder to static/docs folder）
*/

const fs = require('fs');
const path = require('path');

const sourceFolder = 'docs';
const destinationFolder = 'static/docs';

// 删除文件夹
function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      const curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

deleteFolderRecursive(destinationFolder);

// 复制文件夹
function copyFolderSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true }); // 递归创建目标文件夹

    const items = fs.readdirSync(src);

    items.forEach(item => {
        const source = path.join(src, item);
        const target = path.join(dest, item);

        const stat = fs.statSync(source);
        if (stat.isDirectory()) {
            copyFolderSync(source, target);
        } else {
            fs.copyFileSync(source, target);
        }
    });
}

copyFolderSync(sourceFolder, destinationFolder);
