class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static sub(v1, v2) {
        return new Vector3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }

    static cross(v1, v2) {
        return new Vector3(
            v1.y * v2.z - v1.z * v2.y,
            v1.z * v2.x - v1.x * v2.z,
            v1.x * v2.y - v1.y * v2.x
        );
    }

    normalize() {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (len > 0) {
            this.x /= len;
            this.y /= len;
            this.z /= len;
        }
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
}

class Matrix4x4 {
    constructor() {
        this.m = Array(16).fill(0);
        this.identity();
    }

    identity() {
        this.m.fill(0);
        this.m[0] = 1; this.m[5] = 1; this.m[10] = 1; this.m[15] = 1;
        return this;
    }

    static multiplyVector(m, v) {
        const x = v.x * m.m[0] + v.y * m.m[4] + v.z * m.m[8] + m.m[12];
        const y = v.x * m.m[1] + v.y * m.m[5] + v.z * m.m[9] + m.m[13];
        const z = v.x * m.m[2] + v.y * m.m[6] + v.z * m.m[10] + m.m[14];
        const w = v.x * m.m[3] + v.y * m.m[7] + v.z * m.m[11] + m.m[15];
        if (w !== 0) {
            return new Vector3(x / w, y / w, z / w);
        }
        return new Vector3(x, y, z);
    }

    static makeRotation(x, y, z) {
        const mx = new Matrix4x4();
        const my = new Matrix4x4();
        const mz = new Matrix4x4();

        const cx = Math.cos(x), sx = Math.sin(x);
        mx.m[5] = cx; mx.m[6] = sx; mx.m[9] = -sx; mx.m[10] = cx;

        const cy = Math.cos(y), sy = Math.sin(y);
        my.m[0] = cy; my.m[2] = -sy; my.m[8] = sy; my.m[10] = cy;

        const cz = Math.cos(z), sz = Math.sin(z);
        mz.m[0] = cz; mz.m[1] = sz; mz.m[4] = -sz; mz.m[5] = cz;

        return Matrix4x4.multiply(Matrix4x4.multiply(mx, my), mz);
    }

    static multiply(m1, m2) {
        const out = new Matrix4x4();
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                out.m[r * 4 + c] = 
                    m1.m[r * 4 + 0] * m2.m[0 * 4 + c] +
                    m1.m[r * 4 + 1] * m2.m[1 * 4 + c] +
                    m1.m[r * 4 + 2] * m2.m[2 * 4 + c] +
                    m1.m[r * 4 + 3] * m2.m[3 * 4 + c];
            }
        }
        return out;
    }
}

class Mesh {
    constructor(vertices = [], faces = []) {
        this.vertices = vertices.map(v => new Vector3(v[0], v[1], v[2]));
        this.faces = faces;
        this.position = new Vector3(0, 0, 0);
        this.rotation = new Vector3(0, 0, 0);
        this.color = { r: 255, g: 255, b: 255 };
    }

    static createCube(size = 1) {
        const s = size / 2;
        const verts = [
            [-s,-s,-s], [s,-s,-s], [s,s,-s], [-s,s,-s],
            [-s,-s,s],  [s,-s,s],  [s,s,s],  [-s,s,s]
        ];
        const faces = [
            [0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1],
            [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]
        ];
        return new Mesh(verts, faces);
    }

    static createPyramid(width = 1, height = 1) {
        const w = width / 2;
        const h = height / 2;
        const verts = [
            [-w, -h, -w], [w, -h, -w], [w, -h, w], [-w, -h, w], [0, h, 0]
        ];
        const faces = [
            [3, 2, 1, 0], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]
        ];
        return new Mesh(verts, faces);
    }
}

class Scene {
    constructor() {
        this.objects = [];
        this.lightDirection = new Vector3(0.5, -1, -0.5).normalize();
        this.ambientLight = 0.2;
    }

    add(mesh) {
        this.objects.push(mesh);
    }
}

class Renderer {
    constructor(width, height) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);
        
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.background = '#0a0a0f';
        
        this.setSize(width, height);
        this.fov = 400;
        this.cameraDistance = 4;
    }

    setSize(width, height) {
        this.width = this.canvas.width = width;
        this.height = this.canvas.height = height;
    }

    project(v) {
        const zDist = v.z + this.cameraDistance;
        const factor = this.fov / (zDist || 1);
        return {
            x: v.x * factor + this.width / 2,
            y: v.y * factor + this.height / 2,
            z: zDist
        };
    }

    render(scene) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        const renderQueue = [];

        for (const mesh of scene.objects) {
            const rotMat = Matrix4x4.makeRotation(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
            const transformedVerts = mesh.vertices.map(v => {
                let r = Matrix4x4.multiplyVector(rotMat, v);
                r.x += mesh.position.x;
                r.y += mesh.position.y;
                r.z += mesh.position.z;
                return r;
            });

            const projectedVerts = transformedVerts.map(v => this.project(v));

            for (const face of mesh.faces) {
                const p0 = transformedVerts[face[0]];
                const p1 = transformedVerts[face[1]];
                const p2 = transformedVerts[face[2]];

                const side1 = Vector3.sub(p1, p0);
                const side2 = Vector3.sub(p2, p0);
                const normal = Vector3.cross(side1, side2).normalize();

                const cameraView = new Vector3(p0.x, p0.y, p0.z + this.cameraDistance);
                
                if (normal.dot(cameraView) < 0) {
                    let avgZ = 0;
                    face.forEach(idx => avgZ += projectedVerts[idx].z);
                    avgZ /= face.length;

                    renderQueue.push({
                        face: face,
                        projected: projectedVerts,
                        normal: normal,
                        color: mesh.color,
                        z: avgZ
                    });
                }
            }
        }

        renderQueue.sort((a, b) => b.z - a.z);

        for (const item of renderQueue) {
            const dot = item.normal.dot(scene.lightDirection);
            const intensity = Math.max(0, dot);
            const lightFactor = scene.ambientLight + (1 - scene.ambientLight) * intensity;

            const r = Math.floor(item.color.r * lightFactor);
            const g = Math.floor(item.color.g * lightFactor);
            const b = Math.floor(item.color.b * lightFactor);

            this.ctx.fillStyle = `rgb(${r},${g},${b})`;
            this.ctx.strokeStyle = `rgba(0,0,0,0.15)`;
            this.ctx.lineWidth = 1;

            this.ctx.beginPath();
            this.ctx.moveTo(item.projected[item.face[0]].x, item.projected[item.face[0]].y);
            for (let i = 1; i < item.face.length; i++) {
                this.ctx.lineTo(item.projected[item.face[i]].x, item.projected[item.face[i]].y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
}
