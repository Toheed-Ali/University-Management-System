const net = require('net');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');

class MossClient {
    constructor(language = 'javascript', userid = config.mossId || 926864005) {
        this.language = language;
        this.userid = userid;
        this.server = 'moss.stanford.edu';
        this.port = 7690;
        this.files = [];
        this.baseFiles = [];
        this.options = {
            m: 10,
            d: 0,
            x: 0,
            c: "",
            n: 250
        };
    }

    setLanguage(lang) {
        this.language = lang;
        return this;
    }

    setUserId(id) {
        this.userid = id;
        return this;
    }

    addFile(filePath, displayName) {
        if (fs.existsSync(filePath)) {
            this.files.push({ path: filePath, name: displayName || path.basename(filePath) });
        }
        return this;
    }

    addBaseFile(filePath, displayName) {
        if (fs.existsSync(filePath)) {
            this.baseFiles.push({ path: filePath, name: displayName || path.basename(filePath) });
        }
        return this;
    }

    setOptions(opts) {
        this.options = { ...this.options, ...opts };
        return this;
    }

    async submit() {
        return new Promise((resolve, reject) => {
            if (this.files.length === 0) {
                return reject(new Error("No files added for comparison"));
            }

            const client = new net.Socket();
            let responseData = '';

            client.connect(this.port, this.server, () => {
                console.log(`Connected to MOSS server at ${this.server}:${this.port}`);
                
                // 1. Authenticate
                client.write(`moss ${this.userid}\n`);
                client.write(`directory ${this.options.d}\n`);
                client.write(`X ${this.options.x}\n`);
                client.write(`maxmatches ${this.options.m}\n`);
                client.write(`show ${this.options.n}\n`);
                client.write(`language ${this.language}\n`);
            });

            client.on('data', async (data) => {
                const msg = data.toString().trim();
                console.log('MOSS Response:', msg);

                if (msg === 'no') {
                    client.write('end\n');
                    client.destroy();
                    return reject(new Error(`Language ${this.language} not supported by MOSS`));
                }

                if (msg === 'yes') {
                    // Start uploading files
                    try {
                        // Upload base files (id 0)
                        for (const file of this.baseFiles) {
                            await this.uploadFile(client, file.path, 0, file.name);
                        }

                        // Upload submission files (id 1, 2, ...)
                        let id = 1;
                        for (const file of this.files) {
                            await this.uploadFile(client, file.path, id++, file.name);
                        }

                        // Final query
                        client.write(`query 0 ${this.options.c}\n`);
                        console.log('Query submitted, waiting for URL...');
                    } catch (err) {
                        reject(err);
                        client.destroy();
                    }
                } else if (msg.startsWith('http://moss.stanford.edu/results/')) {
                    responseData = msg;
                    client.write('end\n');
                    client.destroy();
                    resolve(responseData);
                }
            });

            client.on('error', (err) => {
                console.error('MOSS Socket Error:', err);
                reject(err);
            });

            client.on('close', () => {
                console.log('MOSS Connection closed');
            });
        });
    }

    async uploadFile(socket, filePath, id, displayName) {
        return new Promise((resolve, reject) => {
            const content = fs.readFileSync(filePath, 'utf8');
            const size = Buffer.byteLength(content);
            const safeName = displayName.replace(/\s/g, '_');
            
            console.log(`Uploading ${safeName} (${size} bytes)...`);
            socket.write(`file ${id} ${this.language} ${size} ${safeName}\n`);
            socket.write(content, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Parses the MOSS result HTML to find matches above the threshold.
     * @param {string} url - The URL of the MOSS results page.
     * @param {number} threshold - Minimum similarity percentage (0-100).
     * @returns {Promise<Array>} - List of detected matches.
     */
    async parseReport(url, threshold = 50) {
        const axios = require('axios');
        try {
            console.log(`Fetching MOSS report from ${url}...`);
            const response = await axios.get(url);
            const html = response.data;
            
            // Regex to find table rows with matches
            // Format is usually: <TR><TD><A HREF="...">submission1.js (55%)</A><TD><A HREF="...">submission2.js (45%)</A>
            const matches = [];
            const rowRegex = /<TR><TD><A HREF="[^"]+">([^<]+) \((\d+)%\)<\/A>\s*<TD><A HREF="[^"]+">([^<]+) \((\d+)%\)<\/A>/gi;
            
            let match;
            while ((match = rowRegex.exec(html)) !== null) {
                const [_, file1, percent1, file2, percent2] = match;
                const p1 = parseInt(percent1, 10);
                const p2 = parseInt(percent2, 10);
                
                if (p1 >= threshold || p2 >= threshold) {
                    matches.push({
                        submission1: file1,
                        percentage1: p1,
                        submission2: file2,
                        percentage2: p2,
                        highest: Math.max(p1, p2)
                    });
                }
            }
            
            return matches;
        } catch (error) {
            console.error('Error parsing MOSS report:', error);
            throw error;
        }
    }
}

module.exports = MossClient;
